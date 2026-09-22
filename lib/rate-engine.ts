import {prisma} from "./prisma";import {getOccupancyMetrics} from "./occupancy-engine";
function nightsBetween(start:Date,end:Date){return Math.ceil((end.getTime()-start.getTime())/86400000);}
export async function quoteAccommodation(accommodationId:string,checkIn:Date,checkOut:Date){
 if(!(checkIn<checkOut))throw new Error("Período inválido.");
 const nights=nightsBetween(checkIn,checkOut);
 const [plan,rules]=await Promise.all([prisma.ratePlan.findFirst({where:{accommodationId,active:true},orderBy:{createdAt:"asc"},include:{overrides:{where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn}},orderBy:{startsAt:"asc"}}}}),prisma.rateRule.findMany({where:{accommodationId,active:true,OR:[{startsAt:null},{startsAt:{lte:checkIn}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:checkOut}}]}]},orderBy:{priority:"asc"}})]);
 if(!plan){const room=await prisma.accommodation.findUnique({where:{id:accommodationId},select:{priceCents:true}});if(room?.priceCents==null)return null;return {currency:"BRL",nights,totalCents:room.priceCents*nights,averageNightCents:room.priceCents,ratePlan:"Tarifa padrão",breakdown:[]};}
 if(nights<plan.minNights||(plan.maxNights&&nights>plan.maxNights))return null;
 const arrival=plan.overrides.find(o=>o.startsAt<=checkIn&&o.endsAt>checkIn);
 const departureProbe=new Date(checkOut);departureProbe.setUTCDate(departureProbe.getUTCDate()-1);
 const departure=plan.overrides.find(o=>o.startsAt<=departureProbe&&o.endsAt>departureProbe);
 if(arrival?.closedToArrival||departure?.closedToDeparture)return null;
 const occupancy=await getOccupancyMetrics(checkIn,checkOut);const now=new Date();const leadDays=Math.floor((checkIn.getTime()-now.getTime())/86400000);const applicable=rules.filter(r=>(r.daysBeforeMin==null||leadDays>=r.daysBeforeMin)&&(r.daysBeforeMax==null||leadDays<=r.daysBeforeMax)&&(r.minOccupancyPct==null||occupancy.occupancyPct>=r.minOccupancyPct)&&(r.maxOccupancyPct==null||occupancy.occupancyPct<=r.maxOccupancyPct));let total=0;const breakdown:{date:string;priceCents:number;override:boolean}[]=[];
 for(let i=0;i<nights;i++){const day=new Date(checkIn);day.setUTCDate(day.getUTCDate()+i);const override=plan.overrides.find(o=>o.startsAt<=day&&o.endsAt>day);if(override?.minNights&&nights<override.minNights)return null;let priceCents=override?.priceCents??plan.basePriceCents;for(const rule of applicable){if(rule.adjustmentType==="PERCENT")priceCents=Math.max(0,Math.round(priceCents*(100+rule.adjustmentValue)/100));else if(rule.adjustmentType==="FIXED")priceCents=Math.max(0,priceCents+rule.adjustmentValue);}total+=priceCents;breakdown.push({date:day.toISOString().slice(0,10),priceCents,override:Boolean(override)});}
 return {currency:plan.currency,nights,totalCents:total,averageNightCents:Math.round(total/nights),ratePlan:plan.name,breakdown,occupancyPct:occupancy.occupancyPct,appliedRules:applicable.map(r=>r.name)};
}
