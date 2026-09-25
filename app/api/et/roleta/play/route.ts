import {randomBytes,randomInt} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import {prisma} from "../../../../../lib/prisma";

export const dynamic="force-dynamic";

function normalizePhone(raw:string){
  let digits=raw.replace(/\D/g,"");
  if(digits.startsWith("00"))digits=digits.slice(2);
  if(digits.length===10||digits.length===11)digits="55"+digits;
  if(digits.length<12||digits.length>13)throw new Error("Informe um telefone com DDD válido.");
  return digits;
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json() as {name?:unknown;phone?:unknown;consent?:unknown};
    const name=String(body.name||"").trim().slice(0,120);
    const phone=normalizePhone(String(body.phone||""));
    if(!name) return NextResponse.json({error:"Informe seu nome."},{status:400});
    if(body.consent!==true) return NextResponse.json({error:"É necessário aceitar os termos da promoção."},{status:400});

    const settings=await prisma.rouletteSettings.findUnique({where:{id:"main"}});
    const now=new Date();
    if(!settings?.active) return NextResponse.json({error:"A roleta está temporariamente indisponível."},{status:409});
    if(settings.activeFrom&&settings.activeFrom>now) return NextResponse.json({error:"A campanha ainda não começou."},{status:409});
    if(settings.activeUntil&&settings.activeUntil<=now) return NextResponse.json({error:"Esta campanha já foi encerrada."},{status:409});

    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"moriah-roulette:"+settings.campaignKey}))`;

      const existing=await tx.rouletteEntry.findUnique({
        where:{campaignKey_phone:{campaignKey:settings.campaignKey,phone}},
        include:{spin:{include:{prize:true}}}
      });
      if(existing){
        throw new Error("ALREADY_PLAYED");
      }

      const prizes=await tx.roulettePrize.findMany({
        where:{active:true},
        orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]
      });
      const eligible=prizes.filter(prize=>prize.quantityTotal===null||prize.awardedCount<prize.quantityTotal);
      if(!eligible.length)throw new Error("NO_PRIZES");

      const totalWeight=eligible.reduce((sum,prize)=>sum+Math.max(1,prize.weight),0);
      let ticket=randomInt(totalWeight);
      let winner=eligible[eligible.length-1];
      for(const prize of eligible){
        ticket-=Math.max(1,prize.weight);
        if(ticket<0){winner=prize;break;}
      }

      const entry=await tx.rouletteEntry.create({data:{
        campaignKey:settings.campaignKey,
        name,
        phone,
        consentAt:now
      }});

      const updated=await tx.roulettePrize.updateMany({
        where:{
          id:winner.id,
          ...(winner.quantityTotal===null?{}:{awardedCount:{lt:winner.quantityTotal}})
        },
        data:{awardedCount:{increment:1}}
      });
      if(updated.count!==1)throw new Error("PRIZE_RACE");

      const claimCode=randomBytes(6).toString("hex").toUpperCase();
      const expiresAt=winner.validityDays
        ?new Date(now.getTime()+winner.validityDays*24*60*60*1000)
        :null;
      const wheel=eligible.map(prize=>({
        id:prize.id,
        name:prize.name,
        color:prize.color,
        textColor:prize.textColor,
        weight:Math.max(1,prize.weight)
      }));

      const spin=await tx.rouletteSpin.create({data:{
        entryId:entry.id,
        prizeId:winner.id,
        claimCode,
        expiresAt,
        wheelSnapshot:wheel,
        resultSnapshot:{
          prizeId:winner.id,
          name:winner.name,
          description:winner.description,
          validityDays:winner.validityDays
        }
      }});

      return {
        spinId:spin.id,
        claimCode,
        expiresAt:expiresAt?.toISOString()||null,
        prize:{id:winner.id,name:winner.name,description:winner.description},
        wheel
      };
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});

    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Erro ao girar a roleta.";
    if(message==="ALREADY_PLAYED")return NextResponse.json({error:"Este telefone já participou desta campanha."},{status:409});
    if(message==="NO_PRIZES")return NextResponse.json({error:"Os prêmios desta campanha acabaram."},{status:409});
    if(message==="PRIZE_RACE")return NextResponse.json({error:"O estoque de prêmios mudou. Tente novamente."},{status:409});
    if(message.includes("telefone"))return NextResponse.json({error:message},{status:400});
    console.error("ROULETTE_SPIN_FAILED",error);
    return NextResponse.json({error:"Não foi possível concluir o sorteio. Tente novamente."},{status:500});
  }
}
