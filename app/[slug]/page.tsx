import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {prisma} from "../../lib/prisma";
import PublicSiteChrome from "../public-site-chrome";
import SiteBuilderRenderer from "../site-builder-renderer";

export const dynamic="force-dynamic";

export async function generateMetadata({
  params
}:{
  params:Promise<{slug:string}>
}):Promise<Metadata>{
  const {slug}=await params;
  const page=await prisma.sitePage.findUnique({
    where:{slug},
    select:{
      published:true,
      title:true,
      description:true,
      seoTitle:true,
      seoDescription:true,
      ogImage:true
    }
  });

  if(!page||!page.published)return {};

  return {
    title:page.seoTitle||page.title+" | Pousada Moriah",
    description:page.seoDescription||page.description||undefined,
    openGraph:page.ogImage?{images:[page.ogImage]}:undefined
  };
}

export default async function DynamicSitePage({
  params
}:{
  params:Promise<{slug:string}>
}){
  const {slug}=await params;

  const [page,settings,rooms,promo,posts,media,navPages]=await Promise.all([
    prisma.sitePage.findUnique({
      where:{slug},
      include:{
        sections:{
          where:{active:true},
          orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]
        }
      }
    }),
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.accommodation.findMany({
      where:{active:true},
      orderBy:[{featured:"desc"},{createdAt:"desc"}],
      take:12
    }),
    prisma.promotion.findFirst({where:{active:true},orderBy:{createdAt:"desc"}}),
    prisma.blogPost.findMany({
      where:{published:true},
      orderBy:{publishedAt:"desc"},
      take:6
    }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:30}),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  if(!page||!page.published||page.slug==="home")notFound();

  const wa=settings?.whatsapp?.replace(/\D/g,"");
  const whatsappHref=wa
    ?"https://wa.me/"+wa+"?text="+encodeURIComponent("Olá! Vim pelo site da Pousada Moriah e gostaria de informações.")
    :null;

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    {page.sections.length?<SiteBuilderRenderer
      sections={page.sections}
      settings={settings}
      rooms={rooms}
      promo={promo}
      posts={posts}
      media={media}
      whatsappHref={whatsappHref}
    />:<section className="siteEmptyPage">
      <small>MORIAH / {page.slug.toUpperCase()}</small>
      <h1>{page.title}</h1>
      <p>{page.description||"Conteúdo em atualização."}</p>
    </section>}
  </PublicSiteChrome>;
}
