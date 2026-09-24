"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

const CHANNELS=new Set(["IN_APP","WHATSAPP","EMAIL","PUSH"]);

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}

function validRecipient(channel:string,recipient:string|null){
  if(channel==="IN_APP")return true;
  if(channel==="EMAIL")return Boolean(recipient&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient));
  if(channel==="WHATSAPP")return Boolean(recipient&&recipient.replace(/\D/g,"").length>=10);
  if(channel==="PUSH")return Boolean(recipient);
  return false;
}

export async function createNotification(formData:FormData){
  await requireAdmin();

  const channel=String(formData.get("channel")||"IN_APP").toUpperCase();
  const title=String(formData.get("title")||"").trim().slice(0,180);
  const body=String(formData.get("body")||"").trim().slice(0,4000);
  const audience=String(formData.get("audience")||"INTERNAL").trim().slice(0,80)||"INTERNAL";
  const recipient=text(formData,"recipient",500);

  if(!CHANNELS.has(channel)||!title||!body)throw new Error("Notificação inválida.");
  if(!validRecipient(channel,recipient))throw new Error("Destinatário inválido para o canal escolhido.");

  const status=channel==="IN_APP"
    ?"SENT"
    :channel==="EMAIL"&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL
      ?"READY"
      :channel==="WHATSAPP"
        ?"READY"
        :"BLOCKED";

  await prisma.notificationMessage.create({
    data:{
      channel,
      audience,
      recipient,
      title,
      body,
      status,
      sentAt:channel==="IN_APP"?new Date():null,
      error:status==="BLOCKED"
        ?channel==="PUSH"
          ?"Push requer credenciais server-side e dispositivo inscrito."
          :"Provider externo ainda não configurado."
        :null
    }
  });

  revalidatePath("/admin/notificacoes");
}

export async function dispatchNotification(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Notificação inválida.");

  const message=await prisma.notificationMessage.findUnique({where:{id}});
  if(!message)throw new Error("Notificação não encontrada.");
  if(message.status==="SENT"||message.status==="CANCELLED")return;

  if(message.channel==="IN_APP"){
    await prisma.notificationMessage.update({
      where:{id},
      data:{status:"SENT",sentAt:new Date(),error:null}
    });
  }else if(message.channel==="EMAIL"){
    const key=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM_EMAIL;
    if(!key||!from||!message.recipient){
      await prisma.notificationMessage.update({
        where:{id},
        data:{status:"BLOCKED",error:"RESEND_API_KEY / RESEND_FROM_EMAIL ausentes."}
      });
      revalidatePath("/admin/notificacoes");
      return;
    }

    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{
        "authorization":"Bearer "+key,
        "content-type":"application/json"
      },
      body:JSON.stringify({
        from,
        to:[message.recipient],
        subject:message.title,
        text:message.body
      })
    });

    if(!response.ok){
      const detail=(await response.text()).slice(0,500);
      await prisma.notificationMessage.update({
        where:{id},
        data:{status:"FAILED",error:"Resend "+response.status+": "+detail}
      });
      revalidatePath("/admin/notificacoes");
      return;
    }

    await prisma.notificationMessage.update({
      where:{id},
      data:{status:"SENT",sentAt:new Date(),error:null}
    });
  }else{
    throw new Error("Este canal exige envio assistido ou provider adicional.");
  }

  revalidatePath("/admin/notificacoes");
}

export async function markNotificationSent(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;

  await prisma.notificationMessage.update({
    where:{id},
    data:{status:"SENT",sentAt:new Date(),error:null}
  });

  revalidatePath("/admin/notificacoes");
}

export async function cancelNotification(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;

  await prisma.notificationMessage.update({
    where:{id},
    data:{status:"CANCELLED"}
  });

  revalidatePath("/admin/notificacoes");
}
