"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

const SECTION_TYPES=[
  "HERO",
  "ACCOMMODATIONS",
  "GALLERY",
  "TRUST",
  "FEATURES",
  "BLOG",
  "CTA",
  "RICH_TEXT",
  "FOOD"
] as const;

const THEMES=["LIGHT","DARK","YELLOW","SOFT"] as const;
const LAYOUTS=["DEFAULT","SPLIT","CENTERED","WIDE","MOSAIC"] as const;

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}

function safeHref(value:string|null){
  if(!value)return null;
  if(value.startsWith("/")||value.startsWith("#"))return value.slice(0,500);
  try{
    const url=new URL(value);
    if(!["http:","https:"].includes(url.protocol))return null;
    return url.toString().slice(0,500);
  }catch{
    return null;
  }
}

function readSection(formData:FormData){
  const type=String(formData.get("type")||"").toUpperCase();
  const theme=String(formData.get("theme")||"LIGHT").toUpperCase();
  const layout=String(formData.get("layout")||"DEFAULT").toUpperCase();
  const orderRaw=Number(formData.get("sortOrder")||100);
  if(!SECTION_TYPES.includes(type as typeof SECTION_TYPES[number]))throw new Error("Tipo de seção inválido.");
  if(!THEMES.includes(theme as typeof THEMES[number]))throw new Error("Tema de seção inválido.");
  if(!LAYOUTS.includes(layout as typeof LAYOUTS[number]))throw new Error("Layout de seção inválido.");

  const imageUrl=text(formData,"imageUrl",2000);
  const mediaUrls=formData.getAll("mediaUrls")
    .map(value=>String(value).trim())
    .filter(value=>/^https?:\/\//i.test(value))
    .slice(0,20);

  return {
    type,
    eyebrow:text(formData,"eyebrow",120),
    title:text(formData,"title",220),
    subtitle:text(formData,"subtitle",300),
    body:text(formData,"body",6000),
    imageUrl:imageUrl&&/^https?:\/\//i.test(imageUrl)?imageUrl:null,
    imageAlt:text(formData,"imageAlt",300),
    mediaUrls,
    ctaLabel:text(formData,"ctaLabel",80),
    ctaHref:safeHref(text(formData,"ctaHref",500)),
    secondaryCtaLabel:text(formData,"secondaryCtaLabel",80),
    secondaryCtaHref:safeHref(text(formData,"secondaryCtaHref",500)),
    theme,
    layout,
    sortOrder:Number.isFinite(orderRaw)?Math.max(0,Math.min(9999,Math.round(orderRaw))):100,
    active:formData.get("active")==="on"
  };
}

export async function ensureHomePage(){
  await requireAdmin();
  return prisma.sitePage.upsert({
    where:{slug:"home"},
    update:{},
    create:{
      id:"home",
      slug:"home",
      title:"Home",
      description:"Página inicial da Pousada Moriah"
    }
  });
}

export async function saveSitePageMeta(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Página inválida.");

  const title=String(formData.get("title")||"").trim().slice(0,180);
  if(!title)throw new Error("Título da página é obrigatório.");

  await prisma.sitePage.update({
    where:{id},
    data:{
      title,
      description:text(formData,"description",1000),
      seoTitle:text(formData,"seoTitle",180),
      seoDescription:text(formData,"seoDescription",320),
      ogImage:text(formData,"ogImage",2000),
      published:formData.get("published")==="on"
    }
  });

  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function createSiteSection(formData:FormData){
  await requireAdmin();
  const pageId=String(formData.get("pageId")||"");
  if(!pageId)throw new Error("Página inválida.");
  const page=await prisma.sitePage.findUnique({where:{id:pageId},select:{id:true}});
  if(!page)throw new Error("Página não encontrada.");

  const data=readSection(formData);
  const row=await prisma.siteSection.create({data:{pageId,...data}});
  revalidatePath("/admin/site");
  revalidatePath("/");
  redirect("/admin/site/"+row.id);
}

export async function updateSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Seção inválida.");
  const data=readSection(formData);
  await prisma.siteSection.update({where:{id},data});
  revalidatePath("/admin/site");
  revalidatePath("/admin/site/"+id);
  revalidatePath("/");
}

export async function toggleSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Seção inválida.");
  const current=await prisma.siteSection.findUnique({where:{id},select:{active:true}});
  if(!current)throw new Error("Seção não encontrada.");
  await prisma.siteSection.update({where:{id},data:{active:!current.active}});
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function deleteSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  await prisma.siteSection.delete({where:{id}});
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function moveSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const direction=String(formData.get("direction")||"");
  if(!id||!["UP","DOWN"].includes(direction))throw new Error("Movimento inválido.");

  const current=await prisma.siteSection.findUnique({
    where:{id},
    select:{id:true,pageId:true,sortOrder:true}
  });
  if(!current)throw new Error("Seção não encontrada.");

  const siblings=await prisma.siteSection.findMany({
    where:{pageId:current.pageId},
    orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
    select:{id:true,sortOrder:true}
  });

  const index=siblings.findIndex(item=>item.id===id);
  const targetIndex=direction==="UP"?index-1:index+1;
  if(index<0||targetIndex<0||targetIndex>=siblings.length)return;
  const target=siblings[targetIndex];

  await prisma.$transaction([
    prisma.siteSection.update({where:{id:current.id},data:{sortOrder:target.sortOrder}}),
    prisma.siteSection.update({where:{id:target.id},data:{sortOrder:current.sortOrder}})
  ]);

  revalidatePath("/admin/site");
  revalidatePath("/");
}
