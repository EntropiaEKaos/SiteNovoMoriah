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
  "FOOD",
  "STATS",
  "FAQ",
  "TESTIMONIALS",
  "CONTACT",
  "VIDEO"
] as const;

const THEMES=["LIGHT","DARK","YELLOW","SOFT"] as const;
const LAYOUTS=["DEFAULT","SPLIT","CENTERED","WIDE","MOSAIC","CARDS"] as const;
const ANIMATIONS=["NONE","FADE_UP","FADE","SLIDE_LEFT","SLIDE_RIGHT","ZOOM"] as const;
const WIDTHS=["NARROW","NORMAL","WIDE","FULL"] as const;
const RESERVED_SLUGS=new Set([
  "admin","api","blog","reservar","restaurante","_next","favicon.ico"
]);

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

function safeMediaHref(value:string|null){
  if(!value)return null;
  if(value.startsWith("/api/media/file?key="))return value.slice(0,2000);
  try{
    const url=new URL(value);
    if(!["http:","https:"].includes(url.protocol))return null;
    return url.toString().slice(0,2000);
  }catch{
    return null;
  }
}

function safeColor(value:string|null){
  if(!value)return null;
  return /^#[0-9a-f]{6}$/i.test(value)?value:null;
}

function safeAnchor(value:string|null){
  if(!value)return null;
  const clean=value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9_-]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80);
  return clean||null;
}

function pageSlug(value:string){
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9-]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,100);
}

function readSection(formData:FormData){
  const type=String(formData.get("type")||"").toUpperCase();
  const theme=String(formData.get("theme")||"LIGHT").toUpperCase();
  const layout=String(formData.get("layout")||"DEFAULT").toUpperCase();
  const animation=String(formData.get("animation")||"FADE_UP").toUpperCase();
  const contentWidth=String(formData.get("contentWidth")||"NORMAL").toUpperCase();
  const orderRaw=Number(formData.get("sortOrder")||100);
  const delayRaw=Number(formData.get("animationDelay")||0);
  const paddingRaw=Number(formData.get("paddingY")||96);

  if(!SECTION_TYPES.includes(type as typeof SECTION_TYPES[number]))throw new Error("Tipo de seção inválido.");
  if(!THEMES.includes(theme as typeof THEMES[number]))throw new Error("Tema de seção inválido.");
  if(!LAYOUTS.includes(layout as typeof LAYOUTS[number]))throw new Error("Layout de seção inválido.");
  if(!ANIMATIONS.includes(animation as typeof ANIMATIONS[number]))throw new Error("Animação inválida.");
  if(!WIDTHS.includes(contentWidth as typeof WIDTHS[number]))throw new Error("Largura de conteúdo inválida.");

  const mediaUrls=formData.getAll("mediaUrls")
    .map(value=>safeMediaHref(String(value).trim()))
    .filter((value):value is string=>Boolean(value))
    .slice(0,20);

  return {
    type,
    eyebrow:text(formData,"eyebrow",120),
    title:text(formData,"title",220),
    subtitle:text(formData,"subtitle",300),
    body:text(formData,"body",8000),
    imageUrl:safeMediaHref(text(formData,"imageUrl",2000)),
    imageAlt:text(formData,"imageAlt",300),
    mediaUrls,
    ctaLabel:text(formData,"ctaLabel",80),
    ctaHref:safeHref(text(formData,"ctaHref",500)),
    secondaryCtaLabel:text(formData,"secondaryCtaLabel",80),
    secondaryCtaHref:safeHref(text(formData,"secondaryCtaHref",500)),
    videoUrl:safeHref(text(formData,"videoUrl",1200)),
    anchorId:safeAnchor(text(formData,"anchorId",100)),
    backgroundImageUrl:safeMediaHref(text(formData,"backgroundImageUrl",2000)),
    backgroundColor:safeColor(text(formData,"backgroundColor",20)),
    textColor:safeColor(text(formData,"textColor",20)),
    animation,
    animationDelay:Number.isFinite(delayRaw)?Math.max(0,Math.min(2000,Math.round(delayRaw))):0,
    paddingY:Number.isFinite(paddingRaw)?Math.max(0,Math.min(240,Math.round(paddingRaw))):96,
    contentWidth,
    hideMobile:formData.get("hideMobile")==="on",
    hideDesktop:formData.get("hideDesktop")==="on",
    theme,
    layout,
    sortOrder:Number.isFinite(orderRaw)?Math.max(0,Math.min(9999,Math.round(orderRaw))):100,
    active:formData.get("active")==="on"
  };
}

function revalidatePublicPage(slug:string){
  revalidatePath("/admin/site");
  revalidatePath("/admin/site/paginas");
  revalidatePath(slug==="home"?"/":"/"+slug);
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
      navLabel:"Início",
      description:"Página inicial da Pousada Moriah"
    }
  });
}

export async function saveSitePageMeta(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Página inválida.");

  const current=await prisma.sitePage.findUnique({where:{id}});
  if(!current)throw new Error("Página não encontrada.");

  const title=String(formData.get("title")||"").trim().slice(0,180);
  if(!title)throw new Error("Título da página é obrigatório.");

  const requestedSlug=current.slug==="home"
    ?"home"
    :pageSlug(String(formData.get("slug")||current.slug));
  if(!requestedSlug)throw new Error("Slug obrigatório.");
  if(requestedSlug!=="home"&&RESERVED_SLUGS.has(requestedSlug))throw new Error("Este endereço é reservado pelo sistema.");

  const sortRaw=Number(formData.get("sortOrder")||100);

  await prisma.sitePage.update({
    where:{id},
    data:{
      slug:requestedSlug,
      title,
      navLabel:text(formData,"navLabel",80),
      showInNav:current.slug==="home"?false:formData.get("showInNav")==="on",
      sortOrder:Number.isFinite(sortRaw)?Math.max(0,Math.min(9999,Math.round(sortRaw))):100,
      description:text(formData,"description",1000),
      seoTitle:text(formData,"seoTitle",180),
      seoDescription:text(formData,"seoDescription",320),
      ogImage:safeMediaHref(text(formData,"ogImage",2000)),
      published:formData.get("published")==="on"
    }
  });

  revalidatePublicPage(current.slug);
  if(requestedSlug!==current.slug)revalidatePublicPage(requestedSlug);
}

export async function createSitePage(formData:FormData){
  await requireAdmin();
  const title=String(formData.get("title")||"").trim().slice(0,180);
  const slug=pageSlug(String(formData.get("slug")||title));
  if(!title||!slug)throw new Error("Título e slug são obrigatórios.");
  if(slug==="home"||RESERVED_SLUGS.has(slug))throw new Error("Este endereço é reservado pelo sistema.");

  const page=await prisma.sitePage.create({
    data:{
      title,
      slug,
      navLabel:text(formData,"navLabel",80)||title,
      description:text(formData,"description",1000),
      published:formData.get("published")==="on",
      showInNav:formData.get("showInNav")==="on",
      sortOrder:100
    }
  });

  revalidatePath("/admin/site/paginas");
  redirect("/admin/site/paginas/"+page.id);
}

export async function duplicateSitePage(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const source=await prisma.sitePage.findUnique({
    where:{id},
    include:{sections:{orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}
  });
  if(!source)throw new Error("Página não encontrada.");

  const base=source.slug==="home"?"home-copy":source.slug+"-copy";
  let slug=base;
  let suffix=2;
  while(await prisma.sitePage.findUnique({where:{slug},select:{id:true}})){
    slug=base+"-"+suffix++;
  }

  const page=await prisma.$transaction(async tx=>{
    const created=await tx.sitePage.create({
      data:{
        slug,
        title:source.title+" — cópia",
        description:source.description,
        seoTitle:source.seoTitle,
        seoDescription:source.seoDescription,
        ogImage:source.ogImage,
        navLabel:source.navLabel,
        showInNav:false,
        sortOrder:source.sortOrder+10,
        published:false
      }
    });

    if(source.sections.length){
      await tx.siteSection.createMany({
        data:source.sections.map(section=>({
          pageId:created.id,
          type:section.type,
          eyebrow:section.eyebrow,
          title:section.title,
          subtitle:section.subtitle,
          body:section.body,
          imageUrl:section.imageUrl,
          imageAlt:section.imageAlt,
          mediaUrls:section.mediaUrls,
          ctaLabel:section.ctaLabel,
          ctaHref:section.ctaHref,
          secondaryCtaLabel:section.secondaryCtaLabel,
          secondaryCtaHref:section.secondaryCtaHref,
          videoUrl:section.videoUrl,
          anchorId:section.anchorId,
          backgroundImageUrl:section.backgroundImageUrl,
          backgroundColor:section.backgroundColor,
          textColor:section.textColor,
          animation:section.animation,
          animationDelay:section.animationDelay,
          paddingY:section.paddingY,
          contentWidth:section.contentWidth,
          hideMobile:section.hideMobile,
          hideDesktop:section.hideDesktop,
          theme:section.theme,
          layout:section.layout,
          sortOrder:section.sortOrder,
          active:section.active
        }))
      });
    }

    return created;
  });

  revalidatePath("/admin/site/paginas");
  redirect("/admin/site/paginas/"+page.id);
}

export async function deleteSitePage(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const page=await prisma.sitePage.findUnique({where:{id},select:{slug:true}});
  if(!page)return;
  if(page.slug==="home")throw new Error("A Home não pode ser excluída.");

  await prisma.sitePage.delete({where:{id}});
  revalidatePath("/admin/site/paginas");
  revalidatePath("/"+page.slug);
  redirect("/admin/site/paginas");
}

export async function createSiteSection(formData:FormData){
  await requireAdmin();
  const pageId=String(formData.get("pageId")||"");
  if(!pageId)throw new Error("Página inválida.");
  const page=await prisma.sitePage.findUnique({where:{id:pageId},select:{id:true,slug:true}});
  if(!page)throw new Error("Página não encontrada.");

  const data=readSection(formData);
  const row=await prisma.siteSection.create({data:{pageId,...data}});
  revalidatePublicPage(page.slug);
  redirect("/admin/site/"+row.id);
}

export async function updateSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Seção inválida.");
  const current=await prisma.siteSection.findUnique({where:{id},include:{page:{select:{slug:true}}}});
  if(!current)throw new Error("Seção não encontrada.");

  const data=readSection(formData);
  await prisma.siteSection.update({where:{id},data});
  revalidatePublicPage(current.page.slug);
  revalidatePath("/admin/site/"+id);
}

export async function duplicateSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const section=await prisma.siteSection.findUnique({where:{id},include:{page:{select:{slug:true}}}});
  if(!section)throw new Error("Seção não encontrada.");

  const {id:_id,createdAt:_createdAt,updatedAt:_updatedAt,page:_page,...data}=section;
  const created=await prisma.siteSection.create({
    data:{
      ...data,
      title:section.title?section.title+" — cópia":section.title,
      sortOrder:section.sortOrder+1,
      active:false
    }
  });

  revalidatePublicPage(section.page.slug);
  redirect("/admin/site/"+created.id);
}

export async function toggleSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Seção inválida.");
  const current=await prisma.siteSection.findUnique({where:{id},include:{page:{select:{slug:true}}}});
  if(!current)throw new Error("Seção não encontrada.");
  await prisma.siteSection.update({where:{id},data:{active:!current.active}});
  revalidatePublicPage(current.page.slug);
}

export async function deleteSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  const current=await prisma.siteSection.findUnique({where:{id},include:{page:{select:{slug:true}}}});
  if(!current)return;
  await prisma.siteSection.delete({where:{id}});
  revalidatePublicPage(current.page.slug);
}

export async function moveSiteSection(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const direction=String(formData.get("direction")||"");
  if(!id||!["UP","DOWN"].includes(direction))throw new Error("Movimento inválido.");

  const current=await prisma.siteSection.findUnique({
    where:{id},
    select:{id:true,pageId:true,page:{select:{slug:true}}}
  });
  if(!current)throw new Error("Seção não encontrada.");

  const siblings=await prisma.siteSection.findMany({
    where:{pageId:current.pageId},
    orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
    select:{id:true}
  });

  const index=siblings.findIndex(item=>item.id===id);
  const targetIndex=direction==="UP"?index-1:index+1;
  if(index<0||targetIndex<0||targetIndex>=siblings.length)return;

  const ordered=siblings.map(item=>item.id);
  [ordered[index],ordered[targetIndex]]=[ordered[targetIndex],ordered[index]];

  await prisma.$transaction(
    ordered.map((sectionId,position)=>prisma.siteSection.update({
      where:{id:sectionId},
      data:{sortOrder:(position+1)*10}
    }))
  );

  revalidatePublicPage(current.page.slug);
}
