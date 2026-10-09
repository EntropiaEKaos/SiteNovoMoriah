import test from "node:test";
import assert from "node:assert/strict";
import {resolveSmoobuApprovedPrice} from "../lib/smoobu-rate-policy.ts";
import {simulateApprovedDailyRates} from "../lib/smoobu-rate-simulation.ts";
const approved={reviewStatus:"APPROVED",priceCents:18000,minNights:2,available:2};
test("unapproved rates never override base price",()=>assert.equal(resolveSmoobuApprovedPrice(12000,{...approved,reviewStatus:"PENDING"},2,1),12000));
test("approved rate applies with valid restrictions",()=>assert.equal(resolveSmoobuApprovedPrice(12000,approved,2,1),18000));
test("minimum stay and available units fall back",()=>{
 assert.equal(resolveSmoobuApprovedPrice(12000,approved,1,1),12000);
 assert.equal(resolveSmoobuApprovedPrice(12000,approved,2,3),12000);
});
test("invalid prices fail closed",()=>assert.equal(resolveSmoobuApprovedPrice(12000,{...approved,priceCents:-10},2,1),12000));
test("simulation does not publish or mutate source",()=>{
 const rates=[{date:"2026-10-20",priceCents:20000,minNights:null,available:2,reviewStatus:"APPROVED"}];
 const result=simulateApprovedDailyRates({checkIn:"2026-10-20",checkOut:"2026-10-21",basePriceCents:15000,sharedRoom:false,requestedUnits:1,approvedRates:rates});
 assert.equal(result[0].proposedPriceCents,20000);
 assert.equal(result[0].differenceCents,5000);
 assert.equal(rates[0].priceCents,20000);
});
test("simulation does not use pending or unavailable rates",()=>{
 const result=simulateApprovedDailyRates({checkIn:"2026-10-20",checkOut:"2026-10-21",basePriceCents:15000,sharedRoom:true,requestedUnits:3,approvedRates:[{date:"2026-10-20",priceCents:20000,minNights:null,available:2,reviewStatus:"APPROVED"}]});
 assert.equal(result[0].proposedPriceCents,null);
});
