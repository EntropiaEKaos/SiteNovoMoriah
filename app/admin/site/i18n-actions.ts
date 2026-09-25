"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";
import {Prisma} from "@prisma/client";

const allowedLocales=new Set(["en","es"]);
const fieldMap:Record<string,string[]>={
  SETTINGS:["siteName","tagline","whatsappFloatingLabel","whatsappFloatingMessage","address"],
  PAGE:["title","description","seoTitle","seoDescription","navLabel"],
  SECTION:["eyebrow","title","subtitle","body","imageAlt","ctaLabel","secondaryCtaLabel"],
  ACCOMMODATION:["name","description","type","beds","rules","amenities"],
  PROMOTION:["title","description"],
  BLOG:["title","excerpt","content"],
  CATEGORY:["name","description"],
  PRODUCT:["name","description","badge","tags","allergens"],
  RESTAURANT_SETTINGS:["menuTitle","menuSubtitle"],
  MOD_GROUP:["name"],
  MOD_OPTION:["name"],
  CHAT_SETTINGS:["chatName","chatWelcome"],
  EVENT:["title","eyebrow","summary","description","category","venue","address","badge","ctaLabel","priceLabel"]
};

function values(fd:FormData,type:string){
  const result:Record<string,unknown>={};
  for(const field of fieldMap[type]||[]){
    const raw=String(fd.get(field)||"").trim();
    if(!raw)continue;
    result[field]=["amenities","tags","allergens"].includes(field)
      ?raw.split(/\r?\n|,/).map(v=>v.trim()).filter(Boolean)
      :raw;
  }
  return result;
}

function mergeTranslations(current:unknown,locale:string,patch:Record<string,unknown>):Prisma.InputJsonValue{
  const root=current&&typeof current==="object"&&!Array.isArray(current)?{...(current as Record<string,unknown>)}:{};
  root[locale]=patch;
  return JSON.parse(JSON.stringify(root)) as Prisma.InputJsonValue;
}

export async function saveSiteTranslation(fd:FormData){
  await requireAdmin();
  const type=String(fd.get("entityType")||"");
  const id=String(fd.get("entityId")||"");
  const locale=String(fd.get("locale")||"");
  if(!fieldMap[type]||!id||!allowedLocales.has(locale))throw new Error("Tradução inválida.");
  const patch=values(fd,type);

  if(type==="SETTINGS"){
    const row=await prisma.siteSettings.findUnique({where:{id}});
    if(!row)throw new Error("Configuração não encontrada.");
    await prisma.siteSettings.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="PAGE"){
    const row=await prisma.sitePage.findUnique({where:{id}}); if(!row)throw new Error("Página não encontrada.");
    await prisma.sitePage.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="SECTION"){
    const row=await prisma.siteSection.findUnique({where:{id}}); if(!row)throw new Error("Seção não encontrada.");
    await prisma.siteSection.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="ACCOMMODATION"){
    const row=await prisma.accommodation.findUnique({where:{id}}); if(!row)throw new Error("Hospedagem não encontrada.");
    await prisma.accommodation.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="PROMOTION"){
    const row=await prisma.promotion.findUnique({where:{id}}); if(!row)throw new Error("Promoção não encontrada.");
    await prisma.promotion.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="BLOG"){
    const row=await prisma.blogPost.findUnique({where:{id}}); if(!row)throw new Error("Post não encontrado.");
    await prisma.blogPost.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="CATEGORY"){
    const row=await prisma.restaurantCategory.findUnique({where:{id}}); if(!row)throw new Error("Categoria não encontrada.");
    await prisma.restaurantCategory.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="PRODUCT"){
    const row=await prisma.restaurantProduct.findUnique({where:{id}}); if(!row)throw new Error("Produto não encontrado.");
    await prisma.restaurantProduct.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="RESTAURANT_SETTINGS"){
    const row=await prisma.restaurantSettings.findUnique({where:{id}}); if(!row)throw new Error("Configuração do restaurante não encontrada.");
    await prisma.restaurantSettings.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="MOD_GROUP"){
    const row=await prisma.restaurantModifierGroup.findUnique({where:{id}}); if(!row)throw new Error("Grupo de adicional não encontrado.");
    await prisma.restaurantModifierGroup.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="MOD_OPTION"){
    const row=await prisma.restaurantModifierOption.findUnique({where:{id}}); if(!row)throw new Error("Adicional não encontrado.");
    await prisma.restaurantModifierOption.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="CHAT_SETTINGS"){
    const row=await prisma.integrationSettings.findUnique({where:{id}}); if(!row)throw new Error("Configuração do assistente não encontrada.");
    await prisma.integrationSettings.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }else if(type==="EVENT"){
    const row=await prisma.moriahEvent.findUnique({where:{id}}); if(!row)throw new Error("Evento não encontrado.");
    await prisma.moriahEvent.update({where:{id},data:{translations:mergeTranslations(row.translations,locale,patch)}});
  }

  revalidatePath("/admin/site/idiomas");
  revalidatePath("/");
  revalidatePath("/hospedagens");
  revalidatePath("/restaurante");
  revalidatePath("/eventos");
  revalidatePath("/blog");
}
