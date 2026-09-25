import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {prisma} from "../../lib/prisma";
import PublicSiteChrome from "../public-site-chrome";
import SiteBuilderRenderer from "../site-builder-renderer";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";

export const dynamic="force-dynamic";

export async function generateMetadata({
  params
}:{
  params:Promise<{slug:string}>
}):Promise<Metadata>{
  const {slug}=await params;
  const locale=await getSiteLocale();
  const page=await prisma.sitePage.findUnique({
    where:{slug},
    select:{
      published:true,
      title:true,
      description:true,
      seoTitle:true,
      seoDescription:true,
      ogImage:true,
      translations:true
    }
  });

  if(!page||!page.published)return {};
  const localized=localizeRecord(page,locale)||page;

  return {
    title:localized.seoTitle||localized.title+" | Pousada Moriah",
    description:localized.seoDescription||localized.description||undefined,
    openGraph:page.ogImage?{images:[page.ogImage]}:undefined
  };
}

export default async function DynamicSitePage({
  params
}:{
  params:Promise<{slug:string}>
}){
  const {slug}=await params;
  const locale=await getSiteLocale();

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
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  if(!page||!page.published||page.slug==="home")notFound();

  const localizedPage=localizeRecord(page,locale)||page;
  const localizedSettings=localizeRecord(settings,locale);
  const localizedRooms=rooms.map(room=>localizeRecord(room,locale)!).filter(Boolean);
  const localizedPromo=localizeRecord(promo,locale);
  const localizedPosts=posts.map(post=>localizeRecord(post,locale)!).filter(Boolean);
  const localizedNavPages=navPages.map(item=>localizeRecord(item,locale)!).filter(Boolean);
  const localizedSections=localizedPage.sections.map(section=>localizeRecord(section,locale)!).filter(Boolean);

  const wa=localizedSettings?.whatsapp?.replace(/\D/g,"");
  const whatsappHref=wa
    ?"https://wa.me/"+wa+"?text="+encodeURIComponent("Olá! Vim pelo site da Pousada Moriah e gostaria de informações.")
    :null;

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    {localizedSections.length?<SiteBuilderRenderer
      sections={localizedSections}
      settings={localizedSettings}
      rooms={localizedRooms}
      promo={localizedPromo}
      posts={localizedPosts}
      media={media}
      whatsappHref={whatsappHref}
      locale={locale}
    />:<section className="siteEmptyPage">
      <small>MORIAH / {localizedPage.slug.toUpperCase()}</small>
      <h1>{localizedPage.title}</h1>
      <p>{localizedPage.description||"Conteúdo em atualização."}</p>
    </section>}
  </PublicSiteChrome>;
}
