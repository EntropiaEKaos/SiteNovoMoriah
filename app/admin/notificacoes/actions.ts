"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";
import {sendAdminPush} from "../../../lib/admin-push";

const CHANNELS=new Set(["IN_APP","WHATSAPP","EMAIL","PUSH"]);

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}

function validRecipient(channel:string,recipient:string|null){
  if(channel==="IN_APP")return true;
  if(channel==="EMAIL")return Boolean(recipient&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient));
  if(channel==="WHATSAPP")return Boolean(recipient&&recipient.replace(/\D/g,"").length>=10);
  if(channel==="PUSH")return true;
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

  const pushReady=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const status=channel==="IN_APP"
    ?"SENT"
    :channel==="EMAIL"&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL
      ?"READY"
      :channel==="WHATSAPP"
        ?"READY"
        :channel==="PUSH"&&pushReady
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
          ?"Push requer FIREBASE_SERVICE_ACCOUNT_JSON."
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
  }else if(message.channel==="PUSH"){
    const devices=await prisma.adminPushDevice.findMany({
      where:{
        active:true,
        ...(message.recipient?{token:message.recipient}: {})
      },
      select:{id:true,token:true}
    });

    if(!devices.length){
      await prisma.notificationMessage.update({
        where:{id},
        data:{status:"BLOCKED",error:"Nenhum dispositivo Admin ativo está inscrito para push."}
      });
      revalidatePath("/admin/notificacoes");
      return;
    }

    try{
      const result=await sendAdminPush({
        tokens:devices.map(device=>device.token),
        title:message.title,
        body:message.body,
        url:"/admin/notificacoes"
      });

      const failedTokens=result.results.filter(item=>!item.ok).map(item=>item.token);
      if(failedTokens.length){
        await prisma.adminPushDevice.updateMany({
          where:{token:{in:failedTokens}},
          data:{active:false}
        });
      }

      await prisma.notificationMessage.update({
        where:{id},
        data:{
          status:result.sent>0?"SENT":"FAILED",
          sentAt:result.sent>0?new Date():null,
          error:result.failed
            ?`${result.sent} enviada(s), ${result.failed} falha(s).`
            :null
        }
      });
    }catch(error){
      await prisma.notificationMessage.update({
        where:{id},
        data:{
          status:"FAILED",
          error:error instanceof Error?error.message:"Falha no Firebase Push."
        }
      });
    }
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


const RULE_CHANNELS=new Set(["IN_APP","WHATSAPP","EMAIL","PUSH"]);

export async function saveNotificationRule(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"").trim();
  const module=String(formData.get("module")||"").trim().toUpperCase().slice(0,60);
  const eventKey=String(formData.get("eventKey")||"").trim().toUpperCase().slice(0,80);
  const label=String(formData.get("label")||"").trim().slice(0,160);
  const audience=String(formData.get("audience")||"INTERNAL").trim().toUpperCase().slice(0,80)||"INTERNAL";
  const advanceMinutes=Number(formData.get("advanceMinutes")||0);
  const channels=formData.getAll("channels")
    .map(value=>String(value).toUpperCase())
    .filter(value=>RULE_CHANNELS.has(value));
  const templateTitle=text(formData,"templateTitle",180);
  const templateBody=text(formData,"templateBody",4000);

  if(!module||!eventKey||!label||!Number.isInteger(advanceMinutes)||advanceMinutes<0||advanceMinutes>525600){
    throw new Error("Regra de notificação inválida.");
  }
  if(!channels.length)throw new Error("Selecione ao menos um canal.");

  const data={
    module,eventKey,label,audience,advanceMinutes,
    channels,
    templateTitle,
    templateBody,
    active:formData.get("active")==="on"
  };

  if(id)await prisma.notificationRule.update({where:{id},data});
  else await prisma.notificationRule.create({data});

  revalidatePath("/admin/notificacoes");
}

export async function deleteNotificationRule(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  await prisma.notificationRule.delete({where:{id}});
  revalidatePath("/admin/notificacoes");
}
