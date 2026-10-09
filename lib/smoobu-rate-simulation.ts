/** Side-effect-free simulation. Never affects public quotes or inventory. */
export type ApprovedDailyRate={date:string;priceCents:number;minNights:number|null;available:number|null;reviewStatus:string};
export type DailyRateSimulation={date:string;currentPriceCents:number;proposedPriceCents:number|null;differenceCents:number|null;reason:string};
export function simulateApprovedDailyRates(input:{
 checkIn:string;checkOut:string;basePriceCents:number|null;sharedRoom:boolean;requestedUnits:number;approvedRates:ApprovedDailyRate[];
}):DailyRateSimulation[]{
 const {checkIn,checkOut,basePriceCents,sharedRoom,requestedUnits,approvedRates}=input;
 const start=Date.parse(checkIn+"T00:00:00Z"),end=Date.parse(checkOut+"T00:00:00Z");
 const nights=(end-start)/86400000;
 if(!Number.isInteger(nights)||nights<1||nights>90||!Number.isInteger(requestedUnits)||requestedUnits<1||requestedUnits>100)throw new Error("Período ou unidades inválidos.");
 const multiplier=sharedRoom?requestedUnits:1;
 const lookup=new Map(approvedRates.map(rate=>[rate.date,rate]));
 return Array.from({length:nights},(_,i)=>{
  const date=new Date(start+i*86400000).toISOString().slice(0,10);
  const rate=lookup.get(date);
  const currentPriceCents=basePriceCents===null?0:basePriceCents*multiplier;
  let reason="Sem tarifa aprovada";
  let proposedPriceCents:number|null=null;
  if(rate?.reviewStatus==="APPROVED"&&Number.isSafeInteger(rate.priceCents)&&rate.priceCents>=100&&rate.priceCents<=100000000){
   if(rate.minNights!==null&&nights<rate.minNights)reason="Estadia mínima não atendida";
   else if(rate.available!==null&&rate.available<requestedUnits)reason="Disponibilidade externa insuficiente";
   else {proposedPriceCents=rate.priceCents*multiplier;reason="Tarifa aprovada (simulação)";}
  }
  return {date,currentPriceCents,proposedPriceCents,differenceCents:proposedPriceCents===null?null:proposedPriceCents-currentPriceCents,reason};
 });
}
