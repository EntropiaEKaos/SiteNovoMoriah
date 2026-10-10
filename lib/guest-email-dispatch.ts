import "server-only";
import {prisma} from "./prisma";

export async function flushReadyGuestEmails(limit=20){
 const apiKey=process.env.RESEND_API_KEY;
 const from=process.env.RESEND_FROM_EMAIL;
 if(!apiKey||!from)return {processed:0,sent:0,failed:0,blocked:true};
 const rows=await prisma.notificationMessage.findMany({where:{channel:"EMAIL",audience:"GUEST",status:"READY",OR:[{scheduledAt:null},{scheduledAt:{lte:new Date()}}]},orderBy:{createdAt:"asc"},take:Math.max(1,Math.min(limit,50))});
 let sent=0,failed=0;
 for(const row of rows){
  const claimed=await prisma.notificationMessage.updateMany({where:{id:row.id,status:"READY"},data:{status:"SENDING",error:null}});
  if(claimed.count!==1)continue;
  const recipient=row.recipient?.trim();
  if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)){
   await prisma.notificationMessage.update({where:{id:row.id},data:{status:"BLOCKED",error:"E-mail do hóspede ausente ou inválido."}});
   failed++;continue;
  }
  try{
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":row.id},body:JSON.stringify({from,to:[recipient],subject:row.title,text:row.body})});
   if(!response.ok)throw new Error("Resend HTTP "+response.status+": "+(await response.text()).slice(0,300));
   await prisma.notificationMessage.update({where:{id:row.id},data:{status:"SENT",sentAt:new Date(),error:null}});
   sent++;
  }catch(error){
   await prisma.notificationMessage.update({where:{id:row.id},data:{status:"FAILED",error:error instanceof Error?error.message.slice(0,500):"Erro no envio."}});
   failed++;
  }
 }
 return {processed:rows.length,sent,failed,blocked:false};
}
