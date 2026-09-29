import {describe,expect,it} from "vitest";
import {applyBillingEvent,isGraceExpired,operationalAccess,type BillingState} from "./billing-state";
import {billingEventKey,decideWebhook,type BillingWebhookEnvelope} from "./billing-webhook";
const active:BillingState={status:"ACTIVE",plan:"PROFESSIONAL",failedAttempts:0,graceUntil:null,cancelAtPeriodEnd:false};
describe("SaaS billing resilience",()=>{
 it("keeps operations available after a transient payment failure",()=>{const s=applyBillingEvent(active,"PAYMENT_FAILED","2026-09-29T12:00:00.000Z");expect(s.status).toBe("PAST_DUE");expect(operationalAccess(s.status)).toBe(true);expect(s.graceUntil).toBeTruthy()});
 it("recovers immediately after payment",()=>{const due=applyBillingEvent(active,"PAYMENT_FAILED","2026-09-29T12:00:00.000Z");expect(applyBillingEvent(due,"PAYMENT_RECOVERED","2026-09-30T12:00:00.000Z").status).toBe("ACTIVE")});
 it("suspends only after explicit grace expiry",()=>{const due=applyBillingEvent(active,"PAYMENT_FAILED","2026-09-29T12:00:00.000Z");expect(isGraceExpired(due,"2026-10-07T12:00:00.000Z")).toBe(true);expect(applyBillingEvent(due,"GRACE_EXPIRED","2026-10-07T12:00:00.000Z").status).toBe("SUSPENDED")});
 it("cancels at period end rather than immediately",()=>{const pending=applyBillingEvent(active,"CANCEL_REQUESTED","2026-09-29T12:00:00.000Z");expect(pending.status).toBe("ACTIVE");expect(applyBillingEvent(pending,"PERIOD_ENDED","2026-10-29T12:00:00.000Z").status).toBe("CANCELED")});
 it("deduplicates provider webhooks",()=>{const e:BillingWebhookEnvelope={provider:"MERCADO_PAGO",eventId:"evt1",eventType:"payment.updated",occurredAt:"2026-09-29T12:00:00.000Z",payloadHash:"abc"};expect(billingEventKey(e)).toBe("MERCADO_PAGO:evt1");expect(decideWebhook(e,new Set(["MERCADO_PAGO:evt1"]))).toBe("DUPLICATE")});
});
