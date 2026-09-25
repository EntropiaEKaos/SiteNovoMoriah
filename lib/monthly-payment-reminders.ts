import "server-only";
import {prisma} from "./prisma";
import {queueSystemNotification} from "./system-notifications";

function isoDay(date:Date){return date.toISOString().slice(0,10)}

export async function processMonthlyPaymentReminders(now=new Date()){
  const horizon=new Date(now);
  horizon.setUTCDate(horizon.getUTCDate()+1);

  const guests=await prisma.guest.findMany({
    where:{monthlyGuest:true,monthlyPaymentDueAt:{not:null,lte:horizon}},
    select:{
      id:true,
      name:true,
      phone:true,
      monthlyPaymentDueAt:true,
      monthlyPaymentLastPaidAt:true
    },
    orderBy:{monthlyPaymentDueAt:"asc"},
    take:200
  });

  let created=0;
  for(const guest of guests){
    if(!guest.monthlyPaymentDueAt)continue;
    const due=guest.monthlyPaymentDueAt;
    const dedupeKey="MONTHLY_PAYMENT:"+guest.id+":"+isoDay(due);

    const before=await prisma.notificationMessage.count({
      where:{dedupeKey:{startsWith:dedupeKey+":"}}
    });

    await queueSystemNotification({
      module:"MENSALISTAS",
      eventKey:"PAYMENT_DUE",
      recipient:guest.phone,
      dedupeKey,
      actionUrl:"/admin/hospedes/"+guest.id,
      variables:{
        guest:guest.name,
        dueAt:due.toLocaleDateString("pt-BR")
      },
      title:due.getTime()<now.getTime()?"Pagamento de mensalista vencido":"Pagamento de mensalista vence em breve",
      body:guest.name+" • vencimento "+due.toLocaleDateString("pt-BR")+
        (guest.monthlyPaymentLastPaidAt?" • último pagamento "+guest.monthlyPaymentLastPaidAt.toLocaleDateString("pt-BR"):"")
    });

    const after=await prisma.notificationMessage.count({
      where:{dedupeKey:{startsWith:dedupeKey+":"}}
    });
    if(after>before)created++;
  }
  return created;
}
