import "server-only";
import {prisma} from "./prisma";
function isoDay(date:Date){return date.toISOString().slice(0,10)}
export async function processMonthlyPaymentReminders(now=new Date()){
  const horizon=new Date(now);horizon.setUTCDate(horizon.getUTCDate()+1);
  const guests=await prisma.guest.findMany({where:{monthlyGuest:true,monthlyPaymentDueAt:{not:null,lte:horizon}},select:{id:true,name:true,phone:true,monthlyPaymentDueAt:true,monthlyPaymentLastPaidAt:true},orderBy:{monthlyPaymentDueAt:"asc"},take:200});
  let created=0;
  for(const guest of guests){
    if(!guest.monthlyPaymentDueAt)continue;
    const due=guest.monthlyPaymentDueAt;
    const dedupeKey="MONTHLY_PAYMENT:"+guest.id+":"+isoDay(due);
    if(await prisma.notificationMessage.findUnique({where:{dedupeKey},select:{id:true}}))continue;
    await prisma.notificationMessage.create({data:{dedupeKey,channel:"IN_APP",audience:"ADMINS",title:due.getTime()<now.getTime()?"Pagamento de mensalista vencido":"Pagamento de mensalista vence hoje",body:guest.name+" • "+guest.phone+" • vencimento "+due.toLocaleDateString("pt-BR")+(guest.monthlyPaymentLastPaidAt?" • último pagamento "+guest.monthlyPaymentLastPaidAt.toLocaleDateString("pt-BR"):""),status:"SENT",sentAt:now}});
    created++;
  }
  return created;
}
