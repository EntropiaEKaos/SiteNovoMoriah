import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";
import {isAccommodationAvailable} from "../../../lib/inventory-engine";
import {quoteAccommodation} from "../../../lib/rate-engine";

const GROQ_URL="https://api.groq.com/openai/v1/chat/completions";
const buckets=new Map<string,{count:number;resetAt:number}>();

const SYSTEM=`Você é o assistente virtual da Pousada Moriah, em Praia Grande, SP. Responda em português do Brasil, acolhedor, objetivo e curto. Use SOMENTE o CONTEXTO MORIAH para afirmar preços, acomodações, capacidades, endereço, promoções e serviços. Valores são em reais e podem exigir confirmação. Nunca diga que uma data está disponível sem consultar o sistema de disponibilidade. Nunca confirme uma reserva no chat. Se faltar informação, diga que a equipe precisa confirmar. Nunca peça cartão, senha, documento ou outro dado sensível.`;

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
  const [settings,rooms,promo]=await Promise.all([
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.accommodation.findMany({
      where:{active:true},
      orderBy:[{featured:"desc"},{createdAt:"desc"}],
      take:12
    }),
    prisma.promotion.findFirst({
      where:{active:true},
      orderBy:{createdAt:"desc"}
    })
  ]);

  return [
    "CONTEXTO MORIAH (dados atuais do CMS):",
    `Nome: ${settings?.siteName||"Pousada Moriah"}`,
    settings?.tagline?`Descrição: ${settings.tagline}`:"",
    settings?.address?`Endereço cadastrado: ${settings.address}`:"",
    settings?.whatsapp?`WhatsApp cadastrado: ${settings.whatsapp}`:"",
    promo
      ?`Promoção ativa: ${promo.title}. ${promo.description||""} ${promo.coupon?`Cupom: ${promo.coupon}`:""}`
      :"Nenhuma promoção ativa cadastrada.",
    rooms.length
      ?"Hospedagens ativas:\n"+rooms.map(room=>`- ${room.name}: tipo ${room.type}, capacidade ${room.capacity}, ${money(room.priceCents)}. ${room.description}`).join("\n")
      :"Nenhuma hospedagem ativa cadastrada.",
    "Para finalizar uma solicitação de reserva: /reservar"
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
  if(length>20_000){
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

  const raw=Array.isArray((body as {messages?:unknown[]})?.messages)
    ?(body as {messages:unknown[]}).messages
    :[];

  const messages:ChatMessage[]=raw
    .slice(-10)
    .filter((item):item is {role:"user"|"assistant";content:string}=>{
      if(!item||typeof item!=="object")return false;
      const record=item as Record<string,unknown>;
      return (record.role==="user"||record.role==="assistant")&&typeof record.content==="string";
    })
    .map(item=>({role:item.role,content:item.content.trim().slice(0,1500)}))
    .filter(item=>item.content.length>0);

  if(!messages.length){
    return NextResponse.json({error:"Mensagem obrigatória."},{status:400});
  }

  try{
    const lastUser=messages.filter(message=>message.role==="user").at(-1)?.content||"";
    const [context,availability]=await Promise.all([
      cmsContext(),
      liveAvailability(lastUser)
    ]);

    const custom=settings?.chatInstructions?.trim()
      ?`\n\nINSTRUÇÕES COMERCIAIS DO ADMIN (não podem contrariar as regras de segurança acima):\n${settings.chatInstructions}`
      :"";

    const response=await fetch(GROQ_URL,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer "+key
      },
      body:JSON.stringify({
        model:settings?.groqModel||process.env.GROQ_CHAT_MODEL||"llama-3.1-8b-instant",
        temperature:settings?.groqTemperature??0.2,
        max_completion_tokens:450,
        messages:[
          {
            role:"system",
            content:SYSTEM+custom+"\n\n"+context+(availability.context?"\n\n"+availability.context:"")
          },
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
      handoff
    });
  }catch(error){
    console.error("CHAT_ERROR",error);
    return NextResponse.json({error:"Atendimento temporariamente indisponível."},{status:502});
  }
}
