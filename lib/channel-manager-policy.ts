/**
 * Channel manager coordination policy.
 *
 * This is deliberately a pure module: all inventory writes must be implemented
 * separately behind an authenticated provider adapter and transactional checks.
 */
export type ChannelProvider="MORIAH"|"ICAL"|"SMOOBU"|"SITEMINDER";
export type SyncDirection="IMPORT_ONLY"|"EXPORT_ONLY"|"BIDIRECTIONAL";
export type ConnectionMode="DISCONNECTED"|"READ_ONLY"|"ACTIVE"|"PAUSED";

export type ChannelPolicy={
 accommodationId:string;
 provider:ChannelProvider;
 direction:SyncDirection;
 mode:ConnectionMode;
 externalAccommodationId?:string;
};

export function validateChannelPolicies(policies:ChannelPolicy[]){
 const errors:string[]=[];
 const seen=new Set<string>();
 for(const p of policies){
  if(!p.accommodationId.trim())errors.push("Acomodação obrigatória.");
  if(p.provider!=="MORIAH"&&p.mode==="ACTIVE"&&!p.externalAccommodationId?.trim()&&p.provider!=="ICAL")
   errors.push("Mapeamento externo obrigatório para "+p.provider+".");
  const key=p.accommodationId+"|"+p.provider;
  if(seen.has(key))errors.push("Provedor duplicado na acomodação "+p.accommodationId+".");
  seen.add(key);
 }
 const writers=new Map<string,ChannelPolicy[]>();
 for(const p of policies){
  if(p.mode!=="ACTIVE"||p.direction==="IMPORT_ONLY")continue;
  const rows=writers.get(p.accommodationId)||[];
  rows.push(p);
  writers.set(p.accommodationId,rows);
 }
 for(const [accommodationId,rows] of writers){
  if(rows.length>1)errors.push("Múltiplos responsáveis pela publicação de inventário na acomodação "+accommodationId+": "+rows.map(x=>x.provider).join(", ")+".");
 }
 return {valid:errors.length===0,errors};
}

export function canPublishAvailability(policy:ChannelPolicy){
 return policy.mode==="ACTIVE"&&policy.direction!=="IMPORT_ONLY"&&
  (policy.provider==="MORIAH"||policy.provider==="ICAL"||Boolean(policy.externalAccommodationId?.trim()));
}

export function channelEventKey(provider:ChannelProvider,externalId:string){
 if(!externalId.trim()||externalId.length>180)throw new Error("Identificador externo inválido.");
 return provider+":"+externalId.trim();
}
