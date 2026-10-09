"use server";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {getSmoobuDailyRates} from "../../../lib/smoobu-rates";
import {revalidatePath} from "next/cache";

export async function stageSmoobuDailyRates(){
 await requireAdmin();
 const mappings=await prisma.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}});
 if(mappings.length===0)throw new Error("Vincule os quartos antes de consultar tarifas.");
 const active=await prisma.accommodation.findMany({where:{id:{in:mappings.map(m=>m.accommodationId)},active:true},select:{id:true}});
 if(active.length!==new Set(mappings.map(m=>m.accommodationId)).size)throw new Error("Há quartos vinculados inativos ou inexistentes.");
 const ids=mappings.map(m=>m.smoobuApartmentId);
 const data=await getSmoobuDailyRates(ids,90);
 if(data.length===0)throw new Error("A Smoobu não retornou tarifas.");
 if(data.length>9000)throw new Error("Limite de tarifas excedido.");
 const mapping=new Map(mappings.map(m=>[m.smoobuApartmentId,m.accommodationId]));
 const seen=new Set<string>();
 const valid=data.filter(rate=>{
  const key=rate.apartmentId+":"+rate.date;
  if(seen.has(key))throw new Error("Tarifa diária duplicada: "+key);
  seen.add(key);
  return rate.priceCents!==null&&rate.priceCents>=100&&rate.priceCents<=100000000;
 });
 if(valid.length===0)throw new Error("Nenhuma tarifa positiva válida recebida.");
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('smoobu-daily-rates-staging'))`;
  const current=await tx.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}});
  if(current.length!==mappings.length||current.some(m=>mapping.get(m.smoobuApartmentId)!==m.accommodationId))throw new Error("Vínculos alterados durante a consulta. Tente novamente.");
  for(const rate of valid){
   const accommodationId=mapping.get(rate.apartmentId);
   if(!accommodationId)throw new Error("Tarifa sem quarto correspondente.");
   const where={smoobuApartmentId_date:{smoobuApartmentId:rate.apartmentId,date:rate.date}};
   const old=await tx.smoobuDailyRateSnapshot.findUnique({where});
   const changed=old&& (old.priceCents!==rate.priceCents||old.accommodationId!==accommodationId||old.minNights!==rate.minNights||old.available!==rate.available);
   const fields={accommodationId,priceCents:rate.priceCents!,minNights:rate.minNights,available:rate.available,reviewStatus:changed?"PENDING":old?.reviewStatus||"PENDING",fetchedAt:new Date()};
   await tx.smoobuDailyRateSnapshot.upsert({where,create:{smoobuApartmentId:rate.apartmentId,date:rate.date,...fields},update:fields});
  }
  await tx.adminAuditLog.create({data:{action:"SMOOBU_DAILY_RATES_STAGED",targetType:"SmoobuDailyRateSnapshot",details:{received:data.length,staged:valid.length,unusable:data.length-valid.length,days:90,sitePricesUnchanged:true}}});
 },{timeout:120000});
 revalidatePath("/admin/canais");
}
