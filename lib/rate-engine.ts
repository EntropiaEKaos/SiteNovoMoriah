import {prisma} from "./prisma";
function nightsBetween(start:Date,end:Date){return Math.ceil((end.getTime()-start.getTime())/86400000);}
export async function quoteAccommodation(accommodationId:string,checkIn:Date,checkOut:Date){
 if(!(checkIn<checkOut))throw new Error("Período inválido.");
 const nights=nightsBetween(checkIn,checkOut);
 const plan=await prisma.ratePlan.findFirst({where:{accommodationId,active:true},orderBy:{createdAt:"asc"},include:{overrides:{where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn}},orderBy:{startsAt:"asc"}}}});
 if(!plan){const room=await prisma.accommodation.findUnique({where:{id:accommodationId},select:{priceCents:true}});if(room?.priceCents==null)return null;return {currency:"BRL",nights,totalCents:room.priceCents*nights,averageNightCents:room.priceCents,ratePlan:"Tarifa padrão",breakdown:[]};}
 if(nights<plan.minNights||(plan.maxNights&&nights>plan.maxNights))return null;
 const arrival=plan.overrides.find(o=>o.startsAt<=checkIn&&o.endsAt>checkIn);
 const departureProbe=new Date(checkOut);departureProbe.setUTCDate(departureProbe.getUTCDate()-1);
 const departure=plan.overrides.find(o=>o.startsAt<=departureProbe&&o.endsAt>departureProbe);
 if(arrival?.closedToArrival||departure?.closedToDeparture)return null;
 let total=0;const breakdown:{date:string;priceCents:number;override:boolean}[]=[];
 for(let i=0;i<nights;i++){const day=new Date(checkIn);day.setUTCDate(day.getUTCDate()+i);const override=plan.overrides.find(o=>o.startsAt<=day&&o.endsAt>day);if(override?.minNights&&nights<override.minNights)return null;const priceCents=override?.priceCents??plan.basePriceCents;total+=priceCents;breakdown.push({date:day.toISOString().slice(0,10),priceCents,override:Boolean(override)});}
 return {currency:plan.currency,nights,totalCents:total,averageNightCents:Math.round(total/nights),ratePlan:plan.name,breakdown};
}
