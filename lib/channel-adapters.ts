export type ChannelAdapterKind="ICAL"|"BOOKING_API"|"AIRBNB_API"|"EXPEDIA_API"|"OTHER_API";
export type AdapterBlock={externalUid:string;summary?:string|null;startsAt:Date;endsAt:Date};
export type AdapterSyncResult={blocks:AdapterBlock[];syncedAt:Date};
export type AdapterContext={integrationId:string;accommodationId:string;provider:string};

export interface ChannelAdapter{
 readonly kind:ChannelAdapterKind;
 sync(context:AdapterContext):Promise<AdapterSyncResult>;
}

const future=(kind:ChannelAdapterKind):ChannelAdapter=>({kind,async sync(){throw new Error(`Adapter ${kind} ainda não está configurado. Use iCal/ICS até a API oficial estar habilitada.`)}});
export const bookingApiAdapter=future("BOOKING_API");
export const airbnbApiAdapter=future("AIRBNB_API");
export const expediaApiAdapter=future("EXPEDIA_API");
export const otherApiAdapter=future("OTHER_API");

export function getFutureChannelAdapter(kind:Exclude<ChannelAdapterKind,"ICAL">){
 return {BOOKING_API:bookingApiAdapter,AIRBNB_API:airbnbApiAdapter,EXPEDIA_API:expediaApiAdapter,OTHER_API:otherApiAdapter}[kind];
}
