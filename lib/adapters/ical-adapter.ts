import ICAL from "ical.js";
import type {ChannelAdapter,AdapterSyncResult} from "../channel-adapters";
import {prisma} from "../prisma";

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
  const u=safeCalendarUrl(row.importUrl);
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
