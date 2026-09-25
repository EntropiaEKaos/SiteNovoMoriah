import "server-only";
import {prisma} from "./prisma";
import {sendAdminPush} from "./admin-push";

function permanentPushFailure(status:number,detail?:string){
  const text=(detail||"").toUpperCase();
  return status===404||
    (status===400&&(text.includes("UNREGISTERED")||text.includes("INVALID_ARGUMENT")||text.includes("REGISTRATION TOKEN")));
}

export async function flushReadyAdminPushNotifications(limit=20){
  if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return {processed:0,sent:0,failed:0};

  const now=new Date();
  const messages=await prisma.notificationMessage.findMany({
    where:{
      channel:"PUSH",
      status:"READY",
      OR:[{scheduledAt:null},{scheduledAt:{lte:now}}]
    },
    orderBy:{createdAt:"asc"},
    take:Math.max(1,Math.min(limit,100))
  });

  let sent=0,failed=0;
  for(const message of messages){
    const claimed=await prisma.notificationMessage.updateMany({
      where:{id:message.id,status:"READY"},
      data:{status:"SENDING",error:null}
    });
    if(claimed.count!==1)continue;

    const devices=await prisma.adminPushDevice.findMany({
      where:{active:true,...(message.recipient?{token:message.recipient}:{})},
      select:{id:true,token:true}
    });

    if(!devices.length){
      await prisma.notificationMessage.update({
        where:{id:message.id},
        data:{status:"BLOCKED",error:"Nenhum dispositivo Admin ativo para receber o push."}
      });
      failed++;
      continue;
    }

    try{
      const result=await sendAdminPush({
        tokens:devices.map(device=>device.token),
        title:message.title,
        body:message.body,
        url:message.actionUrl||"/admin/notificacoes"
      });

      const permanent=result.results
        .filter(item=>!item.ok&&permanentPushFailure(item.status,item.detail))
        .map(item=>item.token);
      if(permanent.length){
        await prisma.adminPushDevice.updateMany({
          where:{token:{in:permanent}},
          data:{active:false}
        });
      }

      await prisma.notificationMessage.update({
        where:{id:message.id},
        data:{
          status:result.sent>0?"SENT":"FAILED",
          sentAt:result.sent>0?new Date():null,
          error:result.failed?String(result.sent)+" enviada(s), "+String(result.failed)+" falha(s).":null
        }
      });
      sent+=result.sent;
      failed+=result.failed;
    }catch(error){
      await prisma.notificationMessage.update({
        where:{id:message.id},
        data:{
          status:"FAILED",
          error:error instanceof Error?error.message:"Falha ao enviar push."
        }
      });
      failed++;
    }
  }

  return {processed:messages.length,sent,failed};
}
