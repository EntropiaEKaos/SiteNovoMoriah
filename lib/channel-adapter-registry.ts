import type {ChannelAdapter,ChannelAdapterKind} from "./channel-adapters";
import {bookingApiAdapter,airbnbApiAdapter,expediaApiAdapter,otherApiAdapter} from "./channel-adapters";
import {icalChannelAdapter} from "./adapters/ical-adapter";

const registry:Record<ChannelAdapterKind,ChannelAdapter>={
 ICAL:icalChannelAdapter,
 BOOKING_API:bookingApiAdapter,
 AIRBNB_API:airbnbApiAdapter,
 EXPEDIA_API:expediaApiAdapter,
 OTHER_API:otherApiAdapter
};

export function getChannelAdapter(kind:ChannelAdapterKind):ChannelAdapter{
 const adapter=registry[kind];
 if(!adapter)throw new Error("Tipo de integração não suportado.");
 return adapter;
}

export function resolveAdapterKind(provider:string,integrationType?:string|null):ChannelAdapterKind{
 const explicit=String(integrationType||"").toUpperCase();
 if(explicit in registry)return explicit as ChannelAdapterKind;
 // Compatibilidade: integrações já existentes de Airbnb/Booking continuam sendo iCal
 // até serem explicitamente migradas para um conector oficial.
 return "ICAL";
}

export function listChannelAdapterCapabilities(){
 return (Object.keys(registry) as ChannelAdapterKind[]).map(kind=>({kind,implemented:kind==="ICAL"}));
}
