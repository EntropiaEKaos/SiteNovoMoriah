export type BillingProvider="MERCADO_PAGO"|"MANUAL";
export type BillingWebhookEnvelope={provider:BillingProvider;eventId:string;eventType:string;occurredAt:string;subscriptionExternalId?:string;customerExternalId?:string;payloadHash:string};
export function billingEventKey(event:BillingWebhookEnvelope){if(!event.eventId||!event.provider)throw new Error("SAAS_BILLING_EVENT_INVALID");return `${event.provider}:${event.eventId}`}
export function assertWebhookEnvelope(event:BillingWebhookEnvelope){if(!event.eventType||!event.occurredAt||!event.payloadHash)throw new Error("SAAS_BILLING_EVENT_INVALID");return event}
export type WebhookDecision="PROCESS"|"DUPLICATE";
export function decideWebhook(event:BillingWebhookEnvelope,processedKeys:ReadonlySet<string>):WebhookDecision{return processedKeys.has(billingEventKey(event))?"DUPLICATE":"PROCESS"}
