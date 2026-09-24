export function normalizeMediaUrl(
  value:FormDataEntryValue|string|null|undefined,
  max=2000
){
  const raw=String(value||"").trim();
  if(!raw)return null;

  if(raw.startsWith("/api/media/")&&!raw.startsWith("//")){
    return raw.slice(0,max);
  }

  try{
    const url=new URL(raw);
    if(!["http:","https:"].includes(url.protocol))return null;
    return url.toString().slice(0,max);
  }catch{
    return null;
  }
}

export function normalizeMediaUrls(
  values:Iterable<FormDataEntryValue|string>,
  maxItems=20,
  maxLength=2000
){
  const out:string[]=[];
  const seen=new Set<string>();

  for(const value of values){
    const normalized=normalizeMediaUrl(value,maxLength);
    if(!normalized||seen.has(normalized))continue;
    seen.add(normalized);
    out.push(normalized);
    if(out.length>=maxItems)break;
  }

  return out;
}
