import type {Prisma} from "@prisma/client";
import {prisma} from "./prisma";

type NotificationTx=Prisma.TransactionClient|typeof prisma;

type QueueInput={
  module:string;
  eventKey:string;
  recipient?:string|null;
  audience?:string;
  title?:string;
  body?:string;
  dedupeKey?:string|null;
  variables?:Record<string,string|number|null|undefined>;
  tx?:NotificationTx;
};

function render(template:string|undefined|null,variables:Record<string,string|number|null|undefined>){
  if(!template)return "";
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g,(_,key)=>{
    const value=variables[key];
    return value==null?"":String(value);
  });
}

function channelStatus(channel:string){
  if(channel==="IN_APP")return "READY";
  if(channel==="EMAIL")return process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL?"READY":"BLOCKED";
  if(channel==="WHATSAPP")return "READY";
  if(channel==="PUSH")return process.env.FIREBASE_SERVICE_ACCOUNT_JSON?"READY":"BLOCKED";
  return "BLOCKED";
}

export async function queueSystemNotification(input:QueueInput){
  const db=input.tx||prisma;
  const rule=await db.notificationRule.findUnique({
    where:{module_eventKey:{module:input.module,eventKey:input.eventKey}}
  });
  if(!rule?.active)return [];

  const variables=input.variables||{};
  const title=(input.title||render(rule.templateTitle,variables)||rule.label).slice(0,180);
  const body=(input.body||render(rule.templateBody,variables)||rule.label).slice(0,4000);
  const audience=input.audience||rule.audience;
  const scheduledAt=rule.advanceMinutes>0
    ?new Date(Date.now()+rule.advanceMinutes*60_000)
    :null;

  const rows=[];
  for(const channel of rule.channels){
    const status=channelStatus(channel);
    if(channel!=="IN_APP"&&channel!=="PUSH"&&!input.recipient)continue;
    const recipient=channel==="PUSH"?null:(input.recipient||null);
    const dedupeKey=input.dedupeKey
      ?input.dedupeKey+":"+channel
      :null;

    try{
      rows.push(await db.notificationMessage.create({
        data:{
          dedupeKey,
          channel,
          audience,
          recipient,
          title,
          body,
          status,
          scheduledAt,
          error:status==="BLOCKED"?"Provider externo ainda não configurado.":null
        }
      }));
    }catch(error){
      const record=error&&typeof error==="object"?error as {code?:unknown}:null;
      if(String(record?.code||"")!=="P2002")throw error;
    }
  }
  return rows;
}
