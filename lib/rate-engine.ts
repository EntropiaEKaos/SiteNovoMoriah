import {prisma} from "./prisma";
import {getOccupancyMetrics} from "./occupancy-engine";

function nightsBetween(start:Date,end:Date){
  return Math.ceil((end.getTime()-start.getTime())/86400000);
}

async function promotions(
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  nights:number,
  total:number,
  coupon?:string|null
){
  const promos=await prisma.promotion.findMany({
    where:{
      active:true,
      OR:[{accommodationId:null},{accommodationId}],
      AND:[
        {OR:[{startsAt:null},{startsAt:{lte:checkIn}}]},
        {OR:[{endsAt:null},{endsAt:{gte:checkOut}}]}
      ]
    },
    orderBy:{createdAt:"asc"}
  });

  const code=String(coupon||"").trim().toLowerCase();
  const eligible=promos.filter(p=>
    (p.minNights==null||nights>=p.minNights)&&
    (!p.coupon||p.coupon.toLowerCase()===code)&&
    p.discountType&&
    p.discountValue!=null
  );

  let discountCents=0;
  const appliedPromotions:string[]=[];

  for(const p of eligible){
    const base=Math.max(0,total-discountCents);
    const amount=p.discountType==="PERCENT"
      ?Math.round(base*p.discountValue!/100)
      :p.discountType==="FIXED"
        ?p.discountValue!
        :0;

    if(amount>0){
      discountCents+=Math.min(base,amount);
      appliedPromotions.push(p.title);
      if(!p.stackable)break;
    }
  }

  return {
    subtotalCents:total,
    discountCents,
    totalCents:Math.max(0,total-discountCents),
    appliedPromotions
  };
}

export async function quoteAccommodation(
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  coupon?:string|null,
  requestedUnits=1
){
  if(
    !(checkIn instanceof Date)||
    !(checkOut instanceof Date)||
    Number.isNaN(checkIn.getTime())||
    Number.isNaN(checkOut.getTime())||
    !(checkIn<checkOut)
  ){
    throw new Error("Período inválido.");
  }

  const nights=nightsBetween(checkIn,checkOut);
  if(nights<1||nights>365)throw new Error("Período fora do limite.");

  const units=Math.max(1,Math.floor(requestedUnits||1));

  const [room,plan,rules]=await Promise.all([
    prisma.accommodation.findFirst({
      where:{id:accommodationId,active:true},
      select:{priceCents:true,sharedRoom:true,bedCount:true,capacity:true}
    }),
    prisma.ratePlan.findFirst({
      where:{accommodationId,active:true},
      orderBy:{createdAt:"asc"},
      include:{
        overrides:{
          where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn}},
          orderBy:{startsAt:"asc"}
        }
      }
    }),
    prisma.rateRule.findMany({
      where:{
        accommodationId,
        active:true,
        OR:[{startsAt:null},{startsAt:{lte:checkIn}}],
        AND:[{OR:[{endsAt:null},{endsAt:{gte:checkOut}}]}]
      },
      orderBy:{priority:"asc"}
    })
  ]);

  if(!room)return null;

  const availableUnits=room.sharedRoom?room.bedCount:room.capacity;
  if(units>availableUnits)return null;
  const multiplier=room.sharedRoom?units:1;

  if(!plan){
    if(room.priceCents==null)return null;
    const nightly=room.priceCents*multiplier;
    const subtotal=nightly*nights;
    const promo=await promotions(accommodationId,checkIn,checkOut,nights,subtotal,coupon);

    return {
      currency:"BRL",
      nights,
      ...promo,
      averageNightCents:Math.round(promo.totalCents/nights),
      ratePlan:"Tarifa padrão",
      breakdown:Array.from({length:nights},(_,i)=>{
        const d=new Date(checkIn);
        d.setUTCDate(d.getUTCDate()+i);
        return {
          date:d.toISOString().slice(0,10),
          priceCents:nightly,
          override:false
        };
      }),
      occupancyPct:null,
      appliedRules:[],
      unitCount:multiplier,
      unitLabel:room.sharedRoom?"cama":"quarto"
    };
  }

  if(nights<plan.minNights||(plan.maxNights&&nights>plan.maxNights))return null;

  const arrival=plan.overrides.find(o=>o.startsAt<=checkIn&&o.endsAt>checkIn);
  const departureProbe=new Date(checkOut);
  departureProbe.setUTCDate(departureProbe.getUTCDate()-1);
  const departure=plan.overrides.find(o=>o.startsAt<=departureProbe&&o.endsAt>departureProbe);
  if(arrival?.closedToArrival||departure?.closedToDeparture)return null;

  const occupancy=await getOccupancyMetrics(checkIn,checkOut);
  const leadDays=Math.floor((checkIn.getTime()-Date.now())/86400000);
  const applicable=rules.filter(r=>
    (r.daysBeforeMin==null||leadDays>=r.daysBeforeMin)&&
    (r.daysBeforeMax==null||leadDays<=r.daysBeforeMax)&&
    (r.minOccupancyPct==null||occupancy.occupancyPct>=r.minOccupancyPct)&&
    (r.maxOccupancyPct==null||occupancy.occupancyPct<=r.maxOccupancyPct)
  );

  let subtotal=0;
  const breakdown:{date:string;priceCents:number;override:boolean}[]=[];

  for(let i=0;i<nights;i++){
    const day=new Date(checkIn);
    day.setUTCDate(day.getUTCDate()+i);
    const override=plan.overrides.find(o=>o.startsAt<=day&&o.endsAt>day);
    if(override?.minNights&&nights<override.minNights)return null;

    let unitPriceCents=override?.priceCents??plan.basePriceCents;
    for(const rule of applicable){
      if(rule.adjustmentType==="PERCENT"){
        unitPriceCents=Math.max(0,Math.round(unitPriceCents*(100+rule.adjustmentValue)/100));
      }else if(rule.adjustmentType==="FIXED"){
        unitPriceCents=Math.max(0,unitPriceCents+rule.adjustmentValue);
      }
    }

    const nightly=unitPriceCents*multiplier;
    subtotal+=nightly;
    breakdown.push({
      date:day.toISOString().slice(0,10),
      priceCents:nightly,
      override:Boolean(override)
    });
  }

  const promo=await promotions(accommodationId,checkIn,checkOut,nights,subtotal,coupon);

  return {
    currency:plan.currency,
    nights,
    ...promo,
    averageNightCents:Math.round(promo.totalCents/nights),
    ratePlan:plan.name,
    breakdown,
    occupancyPct:occupancy.occupancyPct,
    appliedRules:applicable.map(r=>r.name),
    unitCount:multiplier,
    unitLabel:room.sharedRoom?"cama":"quarto"
  };
}
