import {prisma} from "./prisma";
import {isAccommodationAvailable} from "./inventory-engine";
import {icalChannelAdapter} from "./adapters/ical-adapter";

export async function syncChannelIntegration(id:string){
 const row=await prisma.channelIntegration.findUnique({where:{id}});
 if(!row?.active||!row.importUrl||!row.accommodationId)throw new Error("Canal inativo, sem hospedagem ou sem URL de calendário.");
 try{
  const result=await icalChannelAdapter.sync({integrationId:id,accommodationId:row.accommodationId,provider:row.provider});
  const seen=result.blocks.map(block=>block.externalUid);
  await prisma.$transaction(async tx=>{
   for(const block of result.blocks)await tx.channelBlock.upsert({where:{integrationId_externalUid:{integrationId:id,externalUid:block.externalUid}},create:{integrationId:id,...block},update:{summary:block.summary||null,startsAt:block.startsAt,endsAt:block.endsAt}});
   if(seen.length)await tx.channelBlock.deleteMany({where:{integrationId:id,externalUid:{notIn:seen}}});else await tx.channelBlock.deleteMany({where:{integrationId:id}});
   await tx.channelIntegration.update({where:{id},data:{lastSyncAt:result.syncedAt,lastError:null}});
  });
  return result.blocks.length;
 }catch(error){
  const message=error instanceof Error?error.message:"Erro desconhecido";
  await prisma.channelIntegration.update({where:{id},data:{lastError:message.slice(0,500)}});
  throw error;
 }
}

export async function hasAvailabilityConflict(accommodationId:string,checkIn:Date,checkOut:Date){
 return !(await isAccommodationAvailable(accommodationId,checkIn,checkOut));
}
