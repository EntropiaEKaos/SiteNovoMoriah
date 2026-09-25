"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

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

function mergeTranslations(current:unknown,locale:string,patch:Record<string,unknown>){
  const root=current&&typeof current==="object"&&!Array.isArray(current)?{...(current as Record<string,unknown>)}:{};
  root[locale]=patch;
  return root;
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
