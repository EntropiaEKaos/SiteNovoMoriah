import type {SaasFeature,SaasPlan} from "./entitlements";
import {hasFeature} from "./entitlements";
export type Segment="HOTEL"|"HOSTEL"|"POUSADA"|"RESTAURANT"|"HYBRID"|"RENTALS";
export type ProvisioningInput={tenantId:string;ownerPrincipalId:string;segment:Segment;plan:SaasPlan;propertyName:string;requestedFeatures?:SaasFeature[]};
export type ProvisioningStep="TENANT"|"OWNER_MEMBERSHIP"|"PROPERTY"|"FEATURES"|"SETTINGS"|"SUBSCRIPTION"|"AUDIT";
export const PROVISIONING_STEPS:readonly ProvisioningStep[]=["TENANT","OWNER_MEMBERSHIP","PROPERTY","FEATURES","SETTINGS","SUBSCRIPTION","AUDIT"];
const segmentDefaults:Record<Segment,readonly SaasFeature[]>={
 HOTEL:["HOSPITALITY","RESERVATIONS","CALENDAR","CALENDAR_WIDGET","NOTIFICATIONS"],
 HOSTEL:["HOSPITALITY","RESERVATIONS","CALENDAR","CALENDAR_WIDGET","NOTIFICATIONS"],
 POUSADA:["HOSPITALITY","RESERVATIONS","CALENDAR","CALENDAR_WIDGET","NOTIFICATIONS"],
 RESTAURANT:["RESTAURANT","KITCHEN","DELIVERY","NOTIFICATIONS"],
 HYBRID:["HOSPITALITY","RESERVATIONS","CALENDAR","CALENDAR_WIDGET","RESTAURANT","KITCHEN","DELIVERY","NOTIFICATIONS"],
 RENTALS:["RENTALS","NOTIFICATIONS"]
};
export function provisioningKey(tenantId:string){if(!tenantId)throw new Error("SAAS_TENANT_REQUIRED");return `tenant:${tenantId}:bootstrap:v1`}
export function resolveInitialFeatures(input:ProvisioningInput){
 const requested=new Set<SaasFeature>([...segmentDefaults[input.segment],...(input.requestedFeatures??[])]);
 return [...requested].filter(feature=>hasFeature(input.plan,feature));
}
export function validateProvisioningInput(input:ProvisioningInput){
 if(!input.tenantId||!input.ownerPrincipalId||!input.propertyName.trim())throw new Error("SAAS_PROVISIONING_INPUT_INVALID");
 if(input.plan==="INTERNAL")throw new Error("SAAS_INTERNAL_PLAN_NOT_SELF_SERVICE");
 return input;
}
