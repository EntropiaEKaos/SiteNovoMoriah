import {prisma} from "./prisma";

function nightsBetween(start:Date,end:Date){return Math.ceil((end.getTime()-start.getTime())/86400000);}

export async function quoteAccommodation(accommodationId:string,checkIn:Date,checkOut:Date){
 if(!(checkIn<checkOut))throw new Error("Período inválido.");
 const nights=nightsBetween(checkIn,checkOut);
 const plan=await prisma.ratePlan.findFirst({where:{accommodationId,active:true},orderBy:{createdAt:"asc"},include:{overrides:{where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn}},orderBy:{startsAt:"asc"}}}});
 if(!plan){const room=await prisma.accommodation.findUnique({where:{id:accommodationId},select:{priceCents:true}});if(room?.priceCents==null)return null;return {currency:"BRL",nights,totalCents:room.priceCents*nights,averageNightCents:room.priceCents,ratePlan:"Tarifa padrão"};}
 if(nights<plan.minNights||(plan.maxNights&&nights>plan.maxNights))return null;
 let total=0;
 for(let i=0;i<nights;i++){const day=new Date(checkIn);day.setUTCDate(day.getUTCDate()+i);const override=plan.overrides.find(o=>o.startsAt<=day&&o.endsAt>day);if(override?.minNights&&nights<override.minNights)return null;total+=override?.priceCents??plan.basePriceCents;}
 return {currency:plan.currency,nights,totalCents:total,averageNightCents:Math.round(total/nights),ratePlan:plan.name};
}
