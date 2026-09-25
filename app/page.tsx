import type {Metadata} from "next";
import type {
  Accommodation,
  BlogPost,
  Media,
  Promotion,
  SitePage,
  SiteSection,
  MoriahEvent
} from "@prisma/client";
import {prisma} from "../lib/prisma";
import {loadPublicSiteSettings,type PublicSiteSettings} from "../lib/public-site-settings";
import SiteBuilderRenderer from "./site-builder-renderer";
import PublicSiteChrome from "./public-site-chrome";
import EventShowcase from "./event-showcase";
import {getSiteLocale,localizeRecord} from "../lib/site-i18n";

export const dynamic="force-dynamic";

export async function generateMetadata():Promise<Metadata>{
  try{
    const page=await prisma.sitePage.findUnique({where:{slug:"home"}});
    return {
      title:page?.seoTitle||"Pousada Moriah | Praia Grande",
      description:page?.seoDescription||page?.description||"Hospedagem prática e acolhedora em Praia Grande.",
      openGraph:page?.ogImage?{images:[page.ogImage]}:undefined
    };
  }catch{
    return {
      title:"Pousada Moriah | Praia Grande",
      description:"Hospedagem prática e acolhedora em Praia Grande."
    };
  }
}

const fallbackSections=[
  {
    id:"fallback-hero",type:"HERO",eyebrow:"POUSADA & HOSTEL • PRAIA GRANDE",title:null,subtitle:null,body:null,
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:"Reservar agora",ctaHref:"/reservar",
    secondaryCtaLabel:"Conhecer acomodações",secondaryCtaHref:"#hospedagem",theme:"LIGHT",layout:"SPLIT",sortOrder:10,active:true
  },
  {
    id:"fallback-stays",type:"ACCOMMODATIONS",eyebrow:"ESCOLHA SUA ESTADIA",title:"Hospedagem sem complicação.",subtitle:null,
    body:"Quartos pensados para aproveitar Praia Grande com conforto, praticidade e uma experiência direta.",
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:null,ctaHref:null,secondaryCtaLabel:null,secondaryCtaHref:null,
    theme:"LIGHT",layout:"WIDE",sortOrder:20,active:true
  },
  {
    id:"fallback-gallery",type:"GALLERY",eyebrow:"CONHEÇA A MORIAH",title:"Um pouco do seu próximo descanso.",subtitle:null,body:null,
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:null,ctaHref:null,secondaryCtaLabel:null,secondaryCtaHref:null,
    theme:"DARK",layout:"MOSAIC",sortOrder:30,active:true
  },
  {
    id:"fallback-trust",type:"TRUST",eyebrow:null,title:null,subtitle:null,
    body:"Praia Grande, SP\nReserva direta\nAtendimento acolhedor\nExperiência Moriah",
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:null,ctaHref:null,secondaryCtaLabel:null,secondaryCtaHref:null,
    theme:"YELLOW",layout:"WIDE",sortOrder:40,active:true
  },
  {
    id:"fallback-features",type:"FEATURES",eyebrow:"MORIAH ESSENCIAL",title:"O que importa, bem feito.",subtitle:null,
    body:"Wi-Fi para sua estadia\nEspaços de convivência\nBoa localização em Praia Grande",
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:null,ctaHref:null,secondaryCtaLabel:null,secondaryCtaHref:null,
    theme:"DARK",layout:"SPLIT",sortOrder:50,active:true
  },
  {
    id:"fallback-food",type:"FOOD",eyebrow:"MORIAH FOOD",title:"Comida boa também faz parte da estadia.",subtitle:null,
    body:"Conheça o cardápio e peça direto pelo restaurante Moriah.",
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:"Ver Moriah Food",ctaHref:"/restaurante",
    secondaryCtaLabel:null,secondaryCtaHref:null,theme:"SOFT",layout:"SPLIT",sortOrder:60,active:true
  },
  {
    id:"fallback-blog",type:"BLOG",eyebrow:"DICAS & NOVIDADES",title:"Journal Moriah.",subtitle:null,body:null,
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:"Ver todas",ctaHref:"/blog",
    secondaryCtaLabel:null,secondaryCtaHref:null,theme:"LIGHT",layout:"WIDE",sortOrder:70,active:true
  },
  {
    id:"fallback-cta",type:"CTA",eyebrow:"PRONTO PARA VIAJAR?",title:"Faça da Moriah a sua base.",subtitle:null,
    body:"Reserve direto conosco e tenha uma experiência simples do início ao fim.",
    imageUrl:null,imageAlt:null,mediaUrls:[],ctaLabel:"Quero reservar",ctaHref:"/reservar",
    secondaryCtaLabel:null,secondaryCtaHref:null,theme:"YELLOW",layout:"CENTERED",sortOrder:80,active:true
  }
] as unknown as SiteSection[];

type HomePageWithSections=SitePage&{sections:SiteSection[]};
type NavPage={slug:string;title:string;navLabel:string|null};

export default async function Home(){
  const locale=await getSiteLocale();
  let settings:PublicSiteSettings|null=null;
  let rooms:Accommodation[]=[];
  let promo:Promotion|null=null;
  let posts:BlogPost[]=[];
  let media:Media[]=[];
  let page:HomePageWithSections|null=null;
  let navPages:NavPage[]=[];
  let events:MoriahEvent[]=[];

  try{
    [settings,rooms,promo,posts,media,page,navPages]=await Promise.all([
      loadPublicSiteSettings(),
      prisma.accommodation.findMany({
        where:{active:true},
        orderBy:[{featured:"desc"},{createdAt:"desc"}],
        take:6
      }),
      prisma.promotion.findFirst({where:{active:true},orderBy:{createdAt:"desc"}}),
      prisma.blogPost.findMany({where:{published:true},orderBy:{publishedAt:"desc"},take:3}),
      prisma.media.findMany({orderBy:{createdAt:"desc"},take:20}),
      prisma.sitePage.findUnique({
        where:{slug:"home"},
        include:{sections:{where:{active:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}
      }),
      prisma.sitePage.findMany({
        where:{published:true,showInNav:true,slug:{not:"home"}},
        select:{slug:true,title:true,navLabel:true},
        orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
        take:6
      })
    ]);
  }catch(error){
    console.error("HOME_DATA_LOAD_FAILED",error);
  }

  try{
    events=await prisma.moriahEvent.findMany({
      where:{published:true,showOnHome:true},
      orderBy:[{featured:"desc"},{sortOrder:"asc"},{startsAt:"asc"}],
      take:12
    });
  }catch(error){console.error("HOME_EVENTS_LOAD_FAILED",error)}

  const now=new Date();
  const homeEvents=events.filter(event=>(event.endsAt||new Date(event.startsAt.getTime()+24*60*60_000))>=now).slice(0,3);

  const wa=settings?.whatsapp?.replace(/\D/g,"");
  const whatsappHref=wa
    ?"https://wa.me/"+wa+"?text="+encodeURIComponent("Olá! Vim pelo site da Pousada Moriah e gostaria de informações sobre hospedagem.")
    :null;

  const localizedSettings=localizeRecord(settings,locale);
  const localizedRooms=rooms.map(room=>localizeRecord(room,locale)!).filter(Boolean);
  const localizedPromo=localizeRecord(promo,locale);
  const localizedPosts=posts.map(post=>localizeRecord(post,locale)!).filter(Boolean);
  const localizedPage=localizeRecord(page,locale);
  const localizedNavPages=navPages.map(item=>localizeRecord(item,locale)!).filter(Boolean);
  const localizedEvents=homeEvents.map(event=>localizeRecord(event,locale)!).filter(Boolean);
  const sections=localizedPage?.published!==false&&localizedPage?.sections.length
    ?localizedPage.sections.map(section=>localizeRecord(section,locale)!).filter(Boolean)
    :fallbackSections;

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <>
      <SiteBuilderRenderer sections={sections} settings={localizedSettings} rooms={localizedRooms} promo={localizedPromo} posts={localizedPosts} media={media} whatsappHref={whatsappHref}/>
      <EventShowcase events={localizedEvents}/>
    </>
  </PublicSiteChrome>;
}
