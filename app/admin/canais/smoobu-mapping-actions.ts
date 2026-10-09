"use server";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {getSmoobuApartments} from "../../../lib/smoobu-client";
import {validateSmoobuMappings} from "../../../lib/smoobu-mapping";
import {revalidatePath} from "next/cache";
import {randomUUID} from "node:crypto";

export async function saveSmoobuMapping(formData:FormData){
 await requireAdmin();
 const externalId=Number(String(formData.get("smoobuApartmentId")||""));
 const accommodationId=String(formData.get("accommodationId")||"").trim();
 if(!Number.isSafeInteger(externalId)||externalId<=0||!accommodationId)throw new Error("Selecione uma unidade Smoobu e uma acomodação PMS.");
 const [apartments,rooms,current]=await Promise.all([
  getSmoobuApartments(),
  prisma.accommodation.findMany({where:{active:true},select:{id:true}}),
  prisma.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}})
 ]);
 const desired=[...current.filter(x=>x.smoobuApartmentId!==externalId),{smoobuApartmentId:externalId,accommodationId}];
 validateSmoobuMappings(desired,apartments.map(x=>x.id),rooms.map(x=>x.id));
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('smoobu-accommodation-mappings'))`;
  const latest=await tx.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}});
  validateSmoobuMappings([...latest.filter(x=>x.smoobuApartmentId!==externalId),{smoobuApartmentId:externalId,accommodationId}],apartments.map(x=>x.id),rooms.map(x=>x.id));
  await tx.smoobuAccommodationMapping.upsert({where:{smoobuApartmentId:externalId},create:{smoobuApartmentId:externalId,accommodationId},update:{accommodationId}});
  await tx.adminAuditLog.create({data:{action:"SMOOBU_MAPPING_SAVED",targetType:"SmoobuAccommodationMapping",targetId:String(externalId),details:{smoobuApartmentId:externalId,accommodationId,previousAccommodationId:latest.find(x=>x.smoobuApartmentId===externalId)?.accommodationId||null,operationId:randomUUID()}}});
 });
 revalidatePath("/admin/canais");
}
