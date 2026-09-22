import type {ChannelAdapter,ChannelAdapterKind} from "./channel-adapters";
import {bookingApiAdapter,airbnbApiAdapter,expediaApiAdapter,otherApiAdapter} from "./channel-adapters";
import {icalChannelAdapter} from "./adapters/ical-adapter";

export type ChannelAdapterCapability={
 kind:ChannelAdapterKind;
 label:string;
 implemented:boolean;
 supportsImport:boolean;
 supportsExport:boolean;
 supportsRates:boolean;
 supportsReservations:boolean;
};

const registry:Record<ChannelAdapterKind,ChannelAdapter>={
 ICAL:icalChannelAdapter,
 BOOKING_API:bookingApiAdapter,
 AIRBNB_API:airbnbApiAdapter,
 EXPEDIA_API:expediaApiAdapter,
 OTHER_API:otherApiAdapter
};

const capabilities:Record<ChannelAdapterKind,ChannelAdapterCapability>={
 ICAL:{kind:"ICAL",label:"iCal / ICS",implemented:true,supportsImport:true,supportsExport:true,supportsRates:false,supportsReservations:false},
 BOOKING_API:{kind:"BOOKING_API",label:"Booking.com API",implemented:false,supportsImport:false,supportsExport:false,supportsRates:false,supportsReservations:false},
 AIRBNB_API:{kind:"AIRBNB_API",label:"Airbnb API",implemented:false,supportsImport:false,supportsExport:false,supportsRates:false,supportsReservations:false},
 EXPEDIA_API:{kind:"EXPEDIA_API",label:"Expedia API",implemented:false,supportsImport:false,supportsExport:false,supportsRates:false,supportsReservations:false},
 OTHER_API:{kind:"OTHER_API",label:"API personalizada",implemented:false,supportsImport:false,supportsExport:false,supportsRates:false,supportsReservations:false}
};

export function getChannelAdapter(kind:ChannelAdapterKind):ChannelAdapter{
 const adapter=registry[kind];
 if(!adapter)throw new Error("Tipo de integração não suportado.");
 return adapter;
}

export function resolveAdapterKind(integrationType?:string|null):ChannelAdapterKind{
 const explicit=String(integrationType||"").toUpperCase();
 if(explicit in registry)return explicit as ChannelAdapterKind;
 return "ICAL";
}

export function getChannelAdapterCapability(kind:ChannelAdapterKind){return capabilities[kind];}
export function listChannelAdapterCapabilities(){return Object.values(capabilities);}
