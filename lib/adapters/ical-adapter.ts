import ICAL from "ical.js";
import type {ChannelAdapter,AdapterSyncResult} from "../channel-adapters";
import {prisma} from "../prisma";
import {lookup} from "node:dns/promises";

const MAX_REDIRECTS=3,MAX_BYTES=2_000_000;
function privateIp(ip:string){if(ip.includes(":"))return ip==="::1"||ip.toLowerCase().startsWith("fc")||ip.toLowerCase().startsWith("fd")||ip.toLowerCase().startsWith("fe80:");const p=ip.split(".").map(Number);return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)}
async function assertPublicHost(host:string){if(host==="metadata.google.internal"||host.endsWith(".internal"))throw new Error("Host de calendário inválido.");const rows=await lookup(host,{all:true});if(!rows.length||rows.some(x=>privateIp(x.address)))throw new Error("O calendário não pode apontar para rede privada.");}
async function safeCalendarUrl(value:string,base?:URL){const u=base?new URL(value,base):new URL(value);if(u.protocol!=="https:")throw new Error("O calendário precisa usar HTTPS.");const h=u.hostname.toLowerCase();if(h==="localhost"||h==="127.0.0.1"||h==="::1"||h.endsWith(".local"))throw new Error("Host de calendário inválido.");await assertPublicHost(h);return u;}
async function fetchCalendar(value:string,etag?:string|null,lastModified?:string|null){
 let u=await safeCalendarUrl(value);
 for(let hop=0;hop<=MAX_REDIRECTS;hop++){
  const headers:Record<string,string>={"user-agent":"MoriahCalendarSync/2.2","accept":"text/calendar,text/plain;q=0.9,*/*;q=0.1"};if(etag)headers["if-none-match"]=etag;if(lastModified)headers["if-modified-since"]=lastModified;const res=await fetch(u,{headers,redirect:"manual",signal:AbortSignal.timeout(10000),cache:"no-store"});
  if(res.status>=300&&res.status<400){const location=res.headers.get("location");if(!location||hop===MAX_REDIRECTS)throw new Error("Redirecionamento de calendário inválido.");u=await safeCalendarUrl(location,u);continue}
  if(res.status===304)return {notModified:true as const,body:"",etag:res.headers.get("etag")||etag||null,lastModified:res.headers.get("last-modified")||lastModified||null};
  if(!res.ok)throw new Error("Falha HTTP "+res.status);
  const length=Number(res.headers.get("content-length")||0);if(length>MAX_BYTES)throw new Error("Calendário excede o limite permitido.");
  const body=await res.text();if(body.length>MAX_BYTES)throw new Error("Calendário excede o limite permitido.");return {notModified:false as const,body,etag:res.headers.get("etag"),lastModified:res.headers.get("last-modified")};
 }
 throw new Error("Muitos redirecionamentos no calendário.");
}
export const icalChannelAdapter:ChannelAdapter={
 kind:"ICAL",
 async sync(context):Promise<AdapterSyncResult>{
  const row=await prisma.channelIntegration.findUnique({where:{id:context.integrationId},select:{importUrl:true,active:true,etag:true,lastModified:true}});
  if(!row?.active||!row.importUrl)throw new Error("Canal inativo ou sem URL de calendário.");
  const fetched=await fetchCalendar(row.importUrl,row.etag,row.lastModified);if(fetched.notModified)return {blocks:[],syncedAt:new Date(),notModified:true,etag:fetched.etag,lastModified:fetched.lastModified};
  const root=new ICAL.Component(ICAL.parse(fetched.body));
  const events=root.getAllSubcomponents("vevent");
  const blocks=events.flatMap(c=>{const e=new ICAL.Event(c);const externalUid=String(e.uid||"").trim();if(!externalUid||!e.startDate||!e.endDate)return [];const startsAt=e.startDate.toJSDate(),endsAt=e.endDate.toJSDate();if(!(startsAt<endsAt))return [];return [{externalUid,summary:e.summary||null,startsAt,endsAt}]});
  return {blocks,syncedAt:new Date(),etag:fetched.etag,lastModified:fetched.lastModified};
 }
};
