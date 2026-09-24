import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";
import {isAccommodationAvailable} from "../../../lib/inventory-engine";
import {quoteAccommodation} from "../../../lib/rate-engine";

const GROQ_URL="https://api.groq.com/openai/v1/chat/completions";
const buckets=new Map<string,{count:number;resetAt:number}>();

const SYSTEM=`Você é o assistente virtual da Pousada Moriah, em Praia Grande, SP. Responda em português do Brasil, acolhedor, objetivo e curto. Use SOMENTE o CONTEXTO MORIAH fornecido pelo sistema para afirmar preços, acomodações, capacidades, endereço, promoções, serviços, cardápio, pedidos ou valores financeiros. Nunca invente disponibilidade, saldo ou status de pedido. Nunca confirme uma reserva no chat. Se faltar informação, diga que a equipe precisa confirmar. Nunca peça cartão, senha, documento ou outro dado sensível. Contexto financeiro privado só aparece quando o sistema validou um token ativo da própria hospedagem.`;

type ChatMessage={role:"user"|"assistant";content:string};

function money(cents:number|null){
  return cents==null
    ?"preço sob consulta"
    :new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
}

function sameOrigin(req:NextRequest){
  const origin=req.headers.get("origin");
  if(!origin)return true;
  try{
    return new URL(origin).host===req.nextUrl.host;
  }catch{
    return false;
  }
}

function rateLimited(req:NextRequest){
  const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key=forwarded||req.headers.get("x-real-ip")||"unknown";
  const now=Date.now();
  const current=buckets.get(key);

  if(!current||current.resetAt<=now){
    buckets.set(key,{count:1,resetAt:now+60_000});
    return false;
  }

  current.count++;
  return current.count>20;
}

function dateRequest(text:string){
  const iso=[...text.matchAll(/(20\d{2})-(\d{2})-(\d{2})/g)].map(match=>match[0]);
  const br=[...text.matchAll(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?/g)].map(match=>{
    const year=match[3]||String(new Date().getFullYear());
    return `${year}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
  });

  const dates=[...iso,...br];
  const guestMatch=text.match(/(?:para|somos|hóspedes?)\s*(\d{1,2})|(?:\d{1,2})\s*(?:pessoas?|hóspedes?)/i);
  const guests=guestMatch
    ?Number(guestMatch[1]||guestMatch[0].match(/\d+/)?.[0])
    :null;

  return dates.length>=2
    ?{checkIn:dates[0],checkOut:dates[1],guests}
    :null;
}

async function liveAvailability(text:string){
  const request=dateRequest(text);
  if(!request)return {context:"",booking:null as null|{href:string;label:string}};

  const start=new Date(request.checkIn+"T12:00:00Z");
  const end=new Date(request.checkOut+"T12:00:00Z");

  if(!(start<end)){
    return {
      context:"CONSULTA DE DISPONIBILIDADE: datas inválidas; peça ao visitante para confirmar entrada e saída.",
      booking:null
    };
  }

  const rooms=await prisma.accommodation.findMany({
    where:{
      active:true,
      ...(request.guests?{capacity:{gte:request.guests}}:{})
    },
    select:{id:true,name:true,capacity:true,priceCents:true},
    orderBy:[{featured:"desc"},{name:"asc"}],
    take:12
  });

  const checks=await Promise.all(rooms.map(async room=>{
    const [free,quote]=await Promise.all([
      isAccommodationAvailable(room.id,start,end),
      quoteAccommodation(room.id,start,end)
    ]);
    return {...room,free,quote};
  }));

  const free=checks.filter(room=>room.free&&room.quote);
  const best=free[0];
  const params=best
    ?new URLSearchParams({
        accommodationId:best.id,
        checkIn:request.checkIn,
        checkOut:request.checkOut,
        ...(request.guests?{guests:String(request.guests)}:{})
      })
    :null;

  return {
    context:`CONSULTA DE DISPONIBILIDADE REAL (${request.checkIn} até ${request.checkOut}${request.guests?`, ${request.guests} hóspede(s)`:""}): ${free.length
      ?free.map(room=>`${room.name} (capacidade ${room.capacity}, ${money(room.quote!.totalCents)} no total para ${room.quote!.nights} noite(s), plano ${room.quote!.ratePlan})`).join("; ")
      :"nenhuma hospedagem disponível encontrada"}. A consulta considera reservas confirmadas, hóspedes na casa, canais ativos, holds e bloqueios manuais.`,
    booking:best&&params
      ?{href:"/reservar?"+params.toString(),label:"Solicitar "+best.name}
      :null
  };
}

async function cmsContext(){
  const [settings,rooms,promo,restaurant,menu,pages]=await Promise.all([
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.accommodation.findMany({
      where:{active:true},
      orderBy:[{featured:"desc"},{createdAt:"desc"}],
      take:12
    }),
    prisma.promotion.findFirst({
      where:{active:true},
      orderBy:{createdAt:"desc"}
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.restaurantProduct.findMany({
      where:{active:true,category:{active:true}},
      include:{category:true},
      orderBy:[{category:{sortOrder:"asc"}},{sortOrder:"asc"},{name:"asc"}],
      take:40
    }),
    prisma.sitePage.findMany({
      where:{published:true},
      select:{slug:true,title:true,description:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:20
    })
  ]);

  return [
    "CONTEXTO MORIAH (dados atuais do sistema):",
    `Nome: ${settings?.siteName||"Pousada Moriah"}`,
    settings?.tagline?`Descrição: ${settings.tagline}`:"",
    settings?.address?`Endereço cadastrado: ${settings.address}`:"",
    settings?.whatsapp?`WhatsApp cadastrado: ${settings.whatsapp}`:"",
    promo
      ?`Promoção ativa: ${promo.title}. ${promo.description||""} ${promo.coupon?`Cupom: ${promo.coupon}`:""}`
      :"Nenhuma promoção ativa cadastrada.",
    rooms.length
      ?"Hospedagens ativas:\n"+rooms.map(room=>`- ${room.name}: tipo ${room.type}, capacidade ${room.capacity}, ${money(room.priceCents)}, check-in ${room.checkInTime}, check-out ${room.checkOutTime}. ${room.description}`).join("\n")
      :"Nenhuma hospedagem ativa cadastrada.",
    restaurant
      ?`Moriah Food: ${restaurant.acceptingOrders?"aceitando pedidos":"pedidos pausados"}, atendimento ${restaurant.openTime}–${restaurant.closeTime}, conta do quarto ${restaurant.roomChargeEnabled?"disponível":"indisponível"}.`
      :"",
    menu.length
      ?"Cardápio publicado:\n"+menu.map(product=>`- ${product.category.name} / ${product.name}: ${money(product.promotionalPriceCents!=null&&product.promotionalPriceCents<product.priceCents?product.promotionalPriceCents:product.priceCents)}${product.soldOut?" (esgotado)":""}. ${product.description||""}`).join("\n")
      :"",
    pages.length
      ?"Páginas públicas do site: "+pages.map(page=>page.slug==="home"?"Home":page.title+" (/"+page.slug+")").join(", ")+"."
      :"",
    "O PMS Moriah suporta check-in financeiro com adicionais, pagamento parcial ou externo, saldo, recibo de check-in, Moriah Food, KDS e recibos de restaurante.",
    "Para solicitar reserva: /reservar. Para cardápio: /restaurante."
  ].filter(Boolean).join("\n");
}

function privateIntent(text:string){
  return /(meu\s+saldo|saldo\s+devedor|quanto\s+(eu\s+)?devo|minha\s+conta|conta\s+do\s+quarto|valor\s+pendente|meu\s+pedido|status\s+do\s+pedido|meus\s+pedidos|consumo\s+do\s+quarto|quanto\s+falta\s+pagar)/i.test(text);
}

async function privateStayContext(token:string){
  if(!token||token.length<20||token.length>200)return "";

  const booking=await prisma.bookingLead.findFirst({
    where:{restaurantAccessToken:token,status:"CHECKED_IN"},
    include:{
      accommodation:{select:{name:true,roomNumber:true}},
      charges:{orderBy:{createdAt:"asc"}},
      payments:{where:{status:"PAID"},orderBy:{paidAt:"asc"}},
      restaurantRoomCharges:{
        where:{status:{in:["OPEN","SETTLING"]}},
        include:{order:{select:{id:true,status:true,totalCents:true,createdAt:true}}}
      },
      restaurantOrders:{
        where:{status:{in:["NEW","PREPARING","READY"]}},
        orderBy:{createdAt:"desc"},
        take:8
      }
    }
  });

  if(!booking)return "";

  const lodgingCents=booking.quotedTotalCents||0;
  const extrasCents=booking.charges.reduce((sum,charge)=>sum+charge.amountCents,0);
  const lodgingPaidCents=booking.payments
    .filter(payment=>payment.reference!=="RESTAURANT_FOLIO")
    .reduce((sum,payment)=>sum+payment.amountCents,0);
  const lodgingBalanceCents=Math.max(0,lodgingCents+extrasCents-lodgingPaidCents);
  const foodOpenCents=booking.restaurantRoomCharges.reduce((sum,charge)=>sum+charge.amountCents,0);
  const totalDueCents=lodgingBalanceCents+foodOpenCents;

  return [
    "CONTEXTO PRIVADO DA HOSPEDAGEM — TOKEN VALIDADO PELO SISTEMA:",
    `Hospedagem: ${booking.accommodation?.roomNumber||booking.accommodation?.name||"Hospedagem ativa"}.`,
    `Período: ${booking.checkIn?.toLocaleDateString("pt-BR")||"—"} a ${booking.checkOut?.toLocaleDateString("pt-BR")||"—"}.`,
    `Valor da hospedagem: ${money(lodgingCents)}.`,
    `Adicionais do check-in: ${money(extrasCents)}${booking.charges.length?" ("+booking.charges.map(charge=>charge.description+": "+money(charge.amountCents)).join("; ")+")":""}.`,
    `Pago para hospedagem/adicionais: ${money(lodgingPaidCents)}.`,
    `Saldo da hospedagem/adicionais: ${money(lodgingBalanceCents)}.`,
    `Moriah Food em aberto na conta do quarto: ${money(foodOpenCents)}.`,
    `SALDO TOTAL DEVEDOR ATUAL: ${money(totalDueCents)}.`,
    booking.restaurantOrders.length
      ?"Pedidos ativos: "+booking.restaurantOrders.map(order=>"#"+order.id.slice(-6).toUpperCase()+" "+order.status+" "+money(order.totalCents)).join("; ")+"."
      :"Nenhum pedido ativo na cozinha.",
    "Não revele nem solicite nome completo, telefone, documento, token ou dados de pagamento. Se houver divergência, encaminhe para a equipe."
  ].filter(Boolean).join("\n");
}

export async function POST(req:NextRequest){
  if(!sameOrigin(req)){
    return NextResponse.json({error:"Origem não permitida."},{status:403});
  }
  if(rateLimited(req)){
    return NextResponse.json({error:"Muitas mensagens em pouco tempo. Tente novamente em um minuto."},{status:429});
  }

  const length=Number(req.headers.get("content-length")||0);
  if(length>22_000){
    return NextResponse.json({error:"Mensagem muito grande."},{status:413});
  }

  const settings=await prisma.integrationSettings.findUnique({where:{id:"main"}});
  if(settings?.chatEnabled===false){
    return NextResponse.json({error:"Atendimento virtual está temporariamente desativado."},{status:503});
  }

  const key=process.env.GROQ_API_KEY?.trim();
  if(!key){
    return NextResponse.json({error:"Atendimento por IA ainda não configurado."},{status:503});
  }

  let body:unknown;
  try{
    body=await req.json();
  }catch{
    return NextResponse.json({error:"Requisição inválida."},{status:400});
  }

  const record=body&&typeof body==="object"?body as Record<string,unknown>:{};
  const raw=Array.isArray(record.messages)?record.messages:[];
  const bookingToken=typeof record.bookingToken==="string"
    ?record.bookingToken.trim().slice(0,200)
    :"";

  const messages:ChatMessage[]=raw
    .slice(-10)
    .filter((item):item is {role:"user"|"assistant";content:string}=>{
      if(!item||typeof item!=="object")return false;
      const entry=item as Record<string,unknown>;
      return (entry.role==="user"||entry.role==="assistant")&&typeof entry.content==="string";
    })
    .map(item=>({role:item.role,content:item.content.trim().slice(0,1500)}))
    .filter(item=>item.content.length>0);

  if(!messages.length){
    return NextResponse.json({error:"Mensagem obrigatória."},{status:400});
  }

  try{
    const lastUser=messages.filter(message=>message.role==="user").at(-1)?.content||"";
    const wantsPrivate=privateIntent(lastUser);

    const [context,availability,privateContext]=await Promise.all([
      cmsContext(),
      liveAvailability(lastUser),
      wantsPrivate&&bookingToken
        ?privateStayContext(bookingToken)
        :Promise.resolve("")
    ]);

    const missingPrivate=wantsPrivate&&!privateContext
      ?"\n\nCONSULTA PRIVADA: não há hospedagem autenticada nesta sessão. Explique que saldo, conta e pedido específico só podem ser consultados pelo link/QR da hospedagem ativa ou diretamente com a equipe."
      :"";

    const custom=settings?.chatInstructions?.trim()
      ?`\n\nINSTRUÇÕES COMERCIAIS DO ADMIN (não podem contrariar as regras de segurança acima):\n${settings.chatInstructions}`
      :"";

    const systemContext=[
      SYSTEM,
      custom,
      "\n\n"+context,
      availability.context?"\n\n"+availability.context:"",
      privateContext?"\n\n"+privateContext:"",
      missingPrivate
    ].join("");

    const response=await fetch(GROQ_URL,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer "+key
      },
      body:JSON.stringify({
        model:settings?.groqModel||process.env.GROQ_CHAT_MODEL||"llama-3.1-8b-instant",
        temperature:settings?.groqTemperature??0.2,
        max_completion_tokens:500,
        messages:[
          {role:"system",content:systemContext},
          ...messages
        ]
      }),
      signal:AbortSignal.timeout(15_000)
    });

    if(!response.ok){
      console.error("GROQ_CHAT_FAILED",response.status);
      return NextResponse.json({error:"Atendimento temporariamente indisponível."},{status:502});
    }

    const data=await response.json() as {
      choices?:Array<{message?:{content?:string}}>
    };
    const reply=data.choices?.[0]?.message?.content?.trim();

    const site=await prisma.siteSettings.findUnique({
      where:{id:"main"},
      select:{whatsapp:true}
    });
    const whatsapp=site?.whatsapp?.replace(/\D/g,"");
    const wantsHuman=/(atendente|humano|pessoa|whats|whatsapp|falar com|equipe|fechar|reservar agora)/i.test(lastUser);

    const handoff=whatsapp&&wantsHuman
      ?{
          href:"https://wa.me/"+whatsapp+"?text="+encodeURIComponent("Olá! Vim pelo assistente virtual da Pousada Moriah e gostaria de continuar meu atendimento."),
          label:"Continuar no WhatsApp"
        }
      :null;

    return NextResponse.json({
      reply:reply||"Não consegui responder agora. Tente novamente em instantes.",
      booking:availability.booking,
      handoff,
      privateContext:Boolean(privateContext)
    });
  }catch(error){
    console.error("CHAT_ERROR",error);
    return NextResponse.json({error:"Atendimento temporariamente indisponível."},{status:502});
  }
}
