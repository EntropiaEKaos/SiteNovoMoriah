import type {SaasPlan} from "./entitlements";
export type SubscriptionStatus="TRIAL"|"ACTIVE"|"PAST_DUE"|"SUSPENDED"|"CANCELED";
export type BillingEvent="TRIAL_STARTED"|"PAYMENT_CONFIRMED"|"PAYMENT_FAILED"|"GRACE_EXPIRED"|"PAYMENT_RECOVERED"|"CANCEL_REQUESTED"|"PERIOD_ENDED"|"REACTIVATED";
export type BillingState={status:SubscriptionStatus;plan:SaasPlan;failedAttempts:number;graceUntil:string|null;cancelAtPeriodEnd:boolean};
const GRACE_DAYS=7;
function plusDays(iso:string,days:number){const d=new Date(iso);d.setUTCDate(d.getUTCDate()+days);return d.toISOString()}
export function applyBillingEvent(state:BillingState,event:BillingEvent,nowIso:string):BillingState{
 switch(event){
  case "TRIAL_STARTED": return {...state,status:"TRIAL",failedAttempts:0,graceUntil:null};
  case "PAYMENT_CONFIRMED": case "PAYMENT_RECOVERED": case "REACTIVATED": return {...state,status:"ACTIVE",failedAttempts:0,graceUntil:null,cancelAtPeriodEnd:false};
  case "PAYMENT_FAILED": return {...state,status:state.status==="SUSPENDED"?"SUSPENDED":"PAST_DUE",failedAttempts:state.failedAttempts+1,graceUntil:state.graceUntil??plusDays(nowIso,GRACE_DAYS)};
  case "GRACE_EXPIRED": if(state.status!=="PAST_DUE")throw new Error("SAAS_BILLING_TRANSITION_INVALID"); return {...state,status:"SUSPENDED"};
  case "CANCEL_REQUESTED": return {...state,cancelAtPeriodEnd:true};
  case "PERIOD_ENDED": if(!state.cancelAtPeriodEnd)throw new Error("SAAS_BILLING_TRANSITION_INVALID"); return {...state,status:"CANCELED",graceUntil:null};
 }
}
export function operationalAccess(status:SubscriptionStatus){return status==="TRIAL"||status==="ACTIVE"||status==="PAST_DUE"}
export function isGraceExpired(state:BillingState,nowIso:string){return state.status==="PAST_DUE"&&!!state.graceUntil&&new Date(nowIso)>=new Date(state.graceUntil)}
