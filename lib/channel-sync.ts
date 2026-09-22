import {prisma} from "./prisma";
import {isAccommodationAvailable} from "./inventory-engine";
import {getChannelAdapter,resolveAdapterKind} from "./channel-adapter-registry";

export async function syncChannelIntegration(id:string){
 const row=await prisma.channelIntegration.findUnique({where:{id}});
 if(!row?.active||!row.accommodationId)throw new Error("Canal inativo ou sem hospedagem.");
 await prisma.channelIntegration.update({where:{id},data:{lastAttemptAt:new Date(),syncStatus:"SYNCING"}});
 try{
  const kind=resolveAdapterKind(row.integrationType);
  const adapter=getChannelAdapter(kind);
  const result=await adapter.sync({integrationId:id,accommodationId:row.accommodationId,provider:row.provider});
  const seen=result.blocks.map(block=>block.externalUid);
  await prisma.$transaction(async tx=>{
   for(const block of result.blocks)await tx.channelBlock.upsert({where:{integrationId_externalUid:{integrationId:id,externalUid:block.externalUid}},create:{integrationId:id,...block},update:{summary:block.summary||null,startsAt:block.startsAt,endsAt:block.endsAt}});
   if(seen.length)await tx.channelBlock.deleteMany({where:{integrationId:id,externalUid:{notIn:seen}}});else await tx.channelBlock.deleteMany({where:{integrationId:id}});
   await tx.channelIntegration.update({where:{id},data:{lastSyncAt:result.syncedAt,lastSuccessAt:result.syncedAt,syncStatus:"HEALTHY",lastError:null}});
  });
  return result.blocks.length;
 }catch(error){
  const message=error instanceof Error?error.message:"Erro desconhecido";
  await prisma.channelIntegration.update({where:{id},data:{syncStatus:"ERROR",lastError:message.slice(0,500)}});
  throw error;
 }
}

export async function syncAccommodationChannels(accommodationId:string){
 const channels=await prisma.channelIntegration.findMany({where:{accommodationId,active:true},select:{id:true}});
 const results=await Promise.allSettled(channels.map(x=>syncChannelIntegration(x.id)));
 const failures=results.filter((x):x is PromiseRejectedResult=>x.status==="rejected");
 return {channels:channels.length,failures:failures.length};
}

export async function criticalAvailabilityCheck(accommodationId:string,checkIn:Date,checkOut:Date){
 const sync=await syncAccommodationChannels(accommodationId);
 if(sync.failures)throw new Error("Não foi possível atualizar todos os canais. Tente novamente em instantes.");
 return !(await isAccommodationAvailable(accommodationId,checkIn,checkOut));
}

export async function hasAvailabilityConflict(accommodationId:string,checkIn:Date,checkOut:Date){
 return !(await isAccommodationAvailable(accommodationId,checkIn,checkOut));
}
