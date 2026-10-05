"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {prisma} from "../../../../../lib/prisma";
import {createFoodImageDraft} from "../../../../../lib/restaurant-ai-images";
import {verifyMediaObject,mediaPublicUrl,uploadMediaBuffer} from "../../../../../lib/media-storage";
import {generateFoodImage} from "../../../../../lib/food-image-provider";

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

export async function generateImageCandidate(formData:FormData){
  await requireAdmin();
  const id=idOf(formData,"candidateId");
  const candidate=await prisma.restaurantProductImageCandidate.findUnique({where:{id}});
  if(!candidate||!["DRAFT","FAILED"].includes(candidate.status))throw new Error("Candidato não está disponível para geração.");
  await prisma.restaurantProductImageCandidate.update({where:{id},data:{status:"GENERATING",errorMessage:null,provider:"gemini"}});
  try{
    const generated=await generateFoodImage(candidate.prompt,candidate.negativePrompt);
    const media=await uploadMediaBuffer({bytes:generated.bytes,mimeType:generated.mimeType,size:generated.bytes.length,extension:generated.extension});
    await prisma.restaurantProductImageCandidate.update({
      where:{id},
      data:{status:"READY",provider:generated.provider,storageKey:media.key,imageUrl:media.publicUrl,errorMessage:null}
    });
  }catch(error){
    await prisma.restaurantProductImageCandidate.update({
      where:{id},
      data:{status:"FAILED",errorMessage:error instanceof Error?error.message:"Falha desconhecida na geração."}
    });
    throw error;
  }finally{
    revalidatePath("/admin/restaurante/cardapio/imagens-ia");
  }
}

export async function importProductImage(formData:FormData){
  await requireAdmin();
  const productId=idOf(formData,"productId");
  const product=await prisma.restaurantProduct.findUnique({where:{id:productId}});
  if(!product)throw new Error("Produto não encontrado.");
  const file=formData.get("image");
  if(!(file instanceof File)||file.size<=0)throw new Error("Selecione uma imagem.");
  if(file.size>3_500_000)throw new Error("Imagem acima de 3,5 MB.");
  const allowed:{[key:string]:string}={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
  const extension=allowed[file.type];
  if(!extension)throw new Error("Formato não permitido. Use JPEG, PNG ou WebP.");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const media=await uploadMediaBuffer({bytes,mimeType:file.type,size:bytes.length,extension});
  await prisma.$transaction([
    prisma.media.create({data:{url:media.publicUrl,alt:product.name,label:product.name,folder:"moriah-food",storageKey:media.key,mimeType:file.type,sizeBytes:bytes.length,provider:"S3"}}),
    prisma.restaurantProductImageCandidate.create({
      data:{productId,prompt:"Importação manual pelo Menu Studio",provider:"manual-import",status:"READY",storageKey:media.key,imageUrl:media.publicUrl}
    })
  ]);
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
}

export async function importProductImagesBatch(formData:FormData){
  await requireAdmin();
  const entries=Array.from(formData.entries()).filter(([key,value])=>key.startsWith("image:")&&value instanceof File&&value.size>0) as [string,File][];
  if(entries.length===0)throw new Error("Selecione ao menos uma imagem.");
  if(entries.length>20)throw new Error("Envie no máximo 20 imagens por lote.");
  for(const [key,file] of entries){
    const productId=key.slice("image:".length);
    const product=await prisma.restaurantProduct.findUnique({where:{id:productId}});
    if(!product)throw new Error("Produto do lote não encontrado.");
    if(file.size>3_500_000)throw new Error(product.name+": imagem acima de 3,5 MB.");
    const allowed:{[key:string]:string}={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    const extension=allowed[file.type];
    if(!extension)throw new Error(product.name+": formato inválido.");
    const bytes=new Uint8Array(await file.arrayBuffer());
    const media=await uploadMediaBuffer({bytes,mimeType:file.type,size:bytes.length,extension});
    await prisma.$transaction([
      prisma.media.create({data:{url:media.publicUrl,alt:product.name,label:product.name,folder:"moriah-food",storageKey:media.key,mimeType:file.type,sizeBytes:bytes.length,provider:"S3"}}),
      prisma.restaurantProductImageCandidate.create({data:{productId,prompt:"Importação em lote pelo Finalizador de Cardápio",provider:"batch-import",status:"READY",storageKey:media.key,imageUrl:media.publicUrl}})
    ]);
  }
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
}

export async function approveReadyImagesBatch(){
  await requireAdmin();
  const ready=await prisma.restaurantProductImageCandidate.findMany({where:{status:"READY",storageKey:{not:null}},orderBy:{createdAt:"desc"}});
  const newest=new Map<string,(typeof ready)[number]>();
  for(const candidate of ready)if(!newest.has(candidate.productId))newest.set(candidate.productId,candidate);
  for(const candidate of newest.values()){
    if(!candidate.storageKey)continue;
    await verifyMediaObject(candidate.storageKey);
    const imageUrl=mediaPublicUrl(candidate.storageKey);
    await prisma.$transaction([
      prisma.restaurantProduct.update({where:{id:candidate.productId},data:{imageUrl}}),
      prisma.restaurantProductImageCandidate.update({where:{id:candidate.id},data:{status:"APPROVED",imageUrl,approvedAt:new Date()}}),
      prisma.restaurantProductImageCandidate.updateMany({where:{productId:candidate.productId,id:{not:candidate.id},status:{in:["DRAFT","READY"]}},data:{status:"REJECTED",rejectedAt:new Date()}})
    ]);
  }
  revalidatePath("/admin/restaurante/cardapio");
  revalidatePath("/admin/restaurante/cardapio/imagens-ia");
  revalidatePath("/restaurante");
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
