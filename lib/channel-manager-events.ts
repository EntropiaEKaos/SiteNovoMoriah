/**
 * Inbound channel-manager events are never directly applied to inventory.
 * Provider adapters must authenticate payloads before normalization.
 */
import {createHash} from "node:crypto";
import {channelEventKey,type ChannelProvider} from "./channel-manager-policy";

export type ChannelEventKind="RESERVATION_CREATED"|"RESERVATION_UPDATED"|"RESERVATION_CANCELLED"|"AVAILABILITY_UPDATED";
export type NormalizedChannelEvent={
 provider:Exclude<ChannelProvider,"MORIAH"|"ICAL">;
 externalEventId:string;
 externalReservationId?:string;
 kind:ChannelEventKind;
 accommodationId:string;
 receivedAt:string;
 payloadHash:string;
};

export function normalizeChannelEvent(input:{
 provider:NormalizedChannelEvent["provider"];
 externalEventId:string;
 externalReservationId?:string;
 kind:ChannelEventKind;
 accommodationId:string;
 payload:unknown;
},receivedAt=new Date()):NormalizedChannelEvent{
 if(!["SMOOBU","SITEMINDER"].includes(input.provider))throw new Error("Provedor não suportado.");
 if(!["RESERVATION_CREATED","RESERVATION_UPDATED","RESERVATION_CANCELLED","AVAILABILITY_UPDATED"].includes(input.kind))throw new Error("Evento não suportado.");
 if(!input.accommodationId.trim())throw new Error("Acomodação não mapeada.");
 const key=channelEventKey(input.provider,input.externalEventId);
 const payloadHash=createHash("sha256").update(JSON.stringify(input.payload)).digest("hex");
 return {
  provider:input.provider,externalEventId:key,
  externalReservationId:input.externalReservationId?.trim()||undefined,
  kind:input.kind,accommodationId:input.accommodationId,
  receivedAt:receivedAt.toISOString(),payloadHash
 };
}

export function channelEventDeduplicationKey(event:NormalizedChannelEvent){
 return event.externalEventId+":"+event.payloadHash;
}

export function requiresReservationReconciliation(event:NormalizedChannelEvent){
 return event.kind==="RESERVATION_CREATED"||event.kind==="RESERVATION_UPDATED"||event.kind==="RESERVATION_CANCELLED";
}
