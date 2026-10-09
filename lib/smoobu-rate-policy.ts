export type ApprovedRateCandidate={priceCents:number;minNights:number|null;available:number|null;reviewStatus:string}|undefined;
export function resolveSmoobuApprovedPrice(basePriceCents:number,rate:ApprovedRateCandidate,nights:number,units:number){
 if(!rate||rate.reviewStatus!=="APPROVED")return basePriceCents;
 if(!Number.isSafeInteger(rate.priceCents)||rate.priceCents<100||rate.priceCents>100000000)return basePriceCents;
 if(rate.minNights!==null&&rate.minNights>nights)return basePriceCents;
 if(rate.available!==null&&rate.available<units)return basePriceCents;
 return rate.priceCents;
}
