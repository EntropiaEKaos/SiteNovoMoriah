"use server";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {revalidatePath} from "next/cache";

const providers=["BOOKING","AIRBNB"] as const;
function parseProvider(form:FormData){
 const provider=String(form.get("provider")||"");
 if(!providers.some(p=>p===provider))throw new Error("Canal inválido.");
 return provider;
}
export async function saveOtaRoomLink(form:FormData){
 await requireAdmin();
 const provider=parseProvider(form);
 const externalRoomId=String(form.get("externalRoomId")||"").trim();
 const externalRoomName=String(form.get("externalRoomName")||"").trim().slice(0,160);
 const accommodationId=String(form.get("accommodationId")||"").trim();
 if(!externalRoomId||externalRoomId.length>120||!accommodationId)throw new Error("Informe ID externo e quarto do site.");
 const room=await prisma.accommodation.findFirst({where:{id:accommodationId,active:true},select:{id:true}});
 if(!room)throw new Error("Quarto inativo ou inexistente.");
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('ota-room-links'))`;
  const existing=await tx.otaRoomLink.findUnique({where:{provider_externalRoomId:{provider,externalRoomId}}});
  const conflicting=await tx.otaRoomLink.findUnique({where:{provider_accommodationId:{provider,accommodationId}}});
  if(conflicting&&conflicting.id!==existing?.id)throw new Error("Este quarto já está vinculado a outra unidade do mesmo canal.");
  await tx.otaRoomLink.upsert({where:{provider_externalRoomId:{provider,externalRoomId}},create:{provider,externalRoomId,externalRoomName,accommodationId},update:{externalRoomName,accommodationId}});
  await tx.adminAuditLog.create({data:{action:"OTA_ROOM_LINK_SAVED",targetType:"OtaRoomLink",targetId:provider+":"+externalRoomId,details:{provider,externalRoomId,accommodationId,previousAccommodationId:existing?.accommodationId||null}}});
 });
 revalidatePath("/admin/canais");
}
export async function stageOtaPrice(form:FormData){
 await requireAdmin();
 const provider=parseProvider(form);
 const externalRoomId=String(form.get("externalRoomId")||"").trim();
 const raw=String(form.get("priceBRL")||"").trim();
 if(!/^\d{1,7}(?:[,.]\d{1,2})?$/.test(raw))throw new Error("Informe valor em reais válido.");
 const cents=Math.round(Number(raw.replace(",","."))*100);
 if(!Number.isSafeInteger(cents)||cents<100||cents>100000000)throw new Error("Preço fora dos limites.");
 await prisma.$transaction(async tx=>{
  const link=await tx.otaRoomLink.update({where:{provider_externalRoomId:{provider,externalRoomId}},data:{proposedPriceCents:cents,priceSource:"MANUAL"}});
  await tx.adminAuditLog.create({data:{action:"OTA_PRICE_STAGED",targetType:"OtaRoomLink",targetId:link.id,details:{provider,externalRoomId,cents,source:"MANUAL",sitePriceUnchanged:true}}});
 });
 revalidatePath("/admin/canais");
}
export async function applyOtaPriceToSite(form:FormData){
 await requireAdmin();
 const provider=parseProvider(form);
 const externalRoomId=String(form.get("externalRoomId")||"").trim();
 if(form.get("confirm")!=="yes")throw new Error("Confirme a alteração do preço público.");
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('ota-price-approval'))`;
  const link=await tx.otaRoomLink.findUnique({where:{provider_externalRoomId:{provider,externalRoomId}}});
  if(!link||link.proposedPriceCents===null||link.proposedPriceCents<100||link.currency!=="BRL")throw new Error("Preço não disponível.");
  const room=await tx.accommodation.findFirst({where:{id:link.accommodationId,active:true},select:{id:true,priceCents:true}});
  if(!room)throw new Error("Quarto indisponível.");
  await tx.accommodation.update({where:{id:room.id},data:{priceCents:link.proposedPriceCents}});
  await tx.adminAuditLog.create({data:{action:"OTA_PRICE_APPLIED_TO_SITE",targetType:"Accommodation",targetId:room.id,details:{provider,externalRoomId,oldPriceCents:room.priceCents,newPriceCents:link.proposedPriceCents,source:"MANUAL_APPROVED"}}});
 });
 revalidatePath("/admin/canais");
}
