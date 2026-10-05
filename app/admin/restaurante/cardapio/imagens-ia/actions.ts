"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {prisma} from "../../../../../lib/prisma";
import {createFoodImageDraft} from "../../../../../lib/restaurant-ai-images";
import {verifyMediaObject,mediaPublicUrl} from "../../../../../lib/media-storage";

function idOf(formData:FormData,name:string){
  const value=String(formData.get(name)||"").trim();
  if(!value)throw new Error("Identificador obrigatório.");
  return value;
}

export async function createImageDraft(formData:FormData){
  await requireAdmin();
  await createFoodImageDraft(idOf(formData,"productId"));
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
}

export async function rejectImageCandidate(formData:FormData){
  await requireAdmin();
  const id=idOf(formData,"candidateId");
  const candidate=await prisma.restaurantProductImageCandidate.findUnique({where:{id}});
  if(!candidate)throw new Error("Candidato não encontrado.");
  if(candidate.status==="APPROVED")throw new Error("Imagem aprovada não pode ser descartada.");
  await prisma.restaurantProductImageCandidate.update({
    where:{id},
    data:{status:"REJECTED",rejectedAt:new Date()}
  });
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
}

export async function approveImageCandidate(formData:FormData){
  await requireAdmin();
  const id=idOf(formData,"candidateId");
  const candidate=await prisma.restaurantProductImageCandidate.findUnique({where:{id}});
  if(!candidate||candidate.status!=="READY"||!candidate.storageKey){
    throw new Error("Somente uma imagem gerada e pronta pode ser aprovada.");
  }
  await verifyMediaObject(candidate.storageKey);
  const imageUrl=mediaPublicUrl(candidate.storageKey);
  await prisma.$transaction([
    prisma.restaurantProduct.update({where:{id:candidate.productId},data:{imageUrl}}),
    prisma.restaurantProductImageCandidate.update({
      where:{id},
      data:{status:"APPROVED",imageUrl,approvedAt:new Date()}
    }),
    prisma.restaurantProductImageCandidate.updateMany({
      where:{productId:candidate.productId,id:{not:id},status:{in:["DRAFT","READY"]}},
      data:{status:"REJECTED",rejectedAt:new Date()}
    })
  ]);
  revalidatePath("/admin/restaurante/cardapio");
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
  revalidatePath("/restaurante");
}
