import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../../lib/prisma";
import {syncChannelIntegration} from "../../../../lib/channel-sync";
import {processMonthlyPaymentReminders} from "../../../../lib/monthly-payment-reminders";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({error:"unauthorized"},{status:401});
  const now=new Date();
  await prisma.inventoryHold.deleteMany({where:{expiresAt:{lte:now}}});
  const monthlyPaymentReminders=await processMonthlyPaymentReminders(now);
  const rows=await prisma.channelIntegration.findMany({where:{active:true,importUrl:{not:null},OR:[{nextSyncAt:null},{nextSyncAt:{lte:now}}]},select:{id:true},orderBy:{nextSyncAt:"asc"}});
  const results=[];
  for(const row of rows){try{const count=await syncChannelIntegration(row.id);results.push({id:row.id,ok:true,count})}catch(error){results.push({id:row.id,ok:false,error:error instanceof Error?error.message:"erro"})}}
  return NextResponse.json({ok:results.every(item=>item.ok),due:rows.length,monthlyPaymentReminders,results});
}
