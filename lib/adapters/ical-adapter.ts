import ICAL from "ical.js";
import type {ChannelAdapter,AdapterSyncResult} from "../channel-adapters";
import {prisma} from "../prisma";import {lookup} from "node:dns/promises";

function privateIp(ip:string){if(ip.includes(":"))return ip==="::1"||ip.toLowerCase().startsWith("fc")||ip.toLowerCase().startsWith("fd")||ip.toLowerCase().startsWith("fe80:");const p=ip.split(".").map(Number);return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)}
async function assertPublicHost(host:string){if(host==="metadata.google.internal"||host.endsWith(".internal"))throw new Error("Host de calendário inválido.");const rows=await lookup(host,{all:true});if(!rows.length||rows.some(x=>privateIp(x.address)))throw new Error("O calendário não pode apontar para rede privada.");}
function safeCalendarUrl(value:string){
 const u=new URL(value);
 if(u.protocol!=="https:")throw new Error("O calendário precisa usar HTTPS.");
 const h=u.hostname.toLowerCase();
 if(h==="localhost"||h==="127.0.0.1"||h==="::1"||h.endsWith(".local"))throw new Error("Host de calendário inválido.");
 return u;
}

export const icalChannelAdapter:ChannelAdapter={
 kind:"ICAL",
 async sync(context):Promise<AdapterSyncResult>{
  const row=await prisma.channelIntegration.findUnique({where:{id:context.integrationId},select:{importUrl:true,active:true}});
  if(!row?.active||!row.importUrl)throw new Error("Canal inativo ou sem URL de calendário.");
  const u=safeCalendarUrl(row.importUrl);await assertPublicHost(u.hostname);
  const res=await fetch(u,{headers:{"user-agent":"MoriahCalendarSync/2.0"},signal:AbortSignal.timeout(10000),cache:"no-store"});
  if(!res.ok)throw new Error("Falha HTTP "+res.status);
  const body=await res.text();
  if(body.length>2_000_000)throw new Error("Calendário excede o limite permitido.");
  const root=new ICAL.Component(ICAL.parse(body));
  const events=root.getAllSubcomponents("vevent");
  const blocks=events.flatMap(c=>{const e=new ICAL.Event(c);const externalUid=String(e.uid||"").trim();if(!externalUid||!e.startDate||!e.endDate)return [];return [{externalUid,summary:e.summary||null,startsAt:e.startDate.toJSDate(),endsAt:e.endDate.toJSDate()}]});
  return {blocks,syncedAt:new Date()};
 }
};
