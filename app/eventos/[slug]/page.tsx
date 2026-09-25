import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight,CalendarDays,Clock3,MapPin,Sparkles} from "lucide-react";
import {prisma} from "../../../lib/prisma";
import {loadPublicSiteSettings} from "../../../lib/public-site-settings";
import {getSiteLocale,localizeRecord} from "../../../lib/site-i18n";
import PublicSiteChrome from "../../public-site-chrome";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const locale=await getSiteLocale();
  const event=await prisma.moriahEvent.findUnique({where:{slug}});
  if(!event?.published)return {};
  const localized=localizeRecord(event,locale)||event;
  return {
    title:localized.title+" | Eventos Moriah",
    description:localized.summary||localized.description.slice(0,160),
    openGraph:localized.coverImage?{images:[localized.coverImage]}:undefined
  };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const locale=await getSiteLocale();
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"
    ?{back:"← Moriah agenda",about:"ABOUT THE EXPERIENCE",agenda:"SCHEDULE",start:"Starts",end:"Ends",place:"Location",stay:"Stay at Moriah"}
    :locale==="es"
      ?{back:"← Agenda Moriah",about:"SOBRE LA EXPERIENCIA",agenda:"AGENDA",start:"Inicio",end:"Finaliza",place:"Lugar",stay:"Hospédate en Moriah"}
      :{back:"← Agenda Moriah",about:"SOBRE A EXPERIÊNCIA",agenda:"AGENDA",start:"Início",end:"Encerramento",place:"Local",stay:"Hospede-se na Moriah"};

  const [event,settings,navPages]=await Promise.all([
    prisma.moriahEvent.findUnique({where:{slug}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);
  if(!event?.published)notFound();

  const localized=localizeRecord(event,locale)||event;
  const localizedSettings=localizeRecord(settings,locale);
  const localizedNavPages=navPages.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const paragraphs=localized.description.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <article className="eventDetailV7">
      <section className="eventDetailHeroV7">
        <div className="eventDetailBackdropV7">{localized.coverImage?<img src={localized.coverImage} alt={localized.title}/>:<div><Sparkles size={62}/></div>}</div>
        <div className="eventDetailOverlayV7"/>
        <div className="eventDetailHeroCopyV7">
          <Link href="/eventos">{t.back}</Link>
          <small>{localized.eyebrow||localized.category}</small>
          {localized.badge&&<b>{localized.badge}</b>}
          <h1>{localized.title}</h1>
          {localized.summary&&<p>{localized.summary}</p>}
          <div className="eventDetailHeroMetaV7">
            <span><CalendarDays size={16}/>{localized.startsAt.toLocaleString(localeTag,{dateStyle:"long",timeStyle:"short"})}</span>
            {localized.venue&&<span><MapPin size={16}/>{localized.venue}</span>}
            {localized.priceLabel&&<span><Sparkles size={16}/>{localized.priceLabel}</span>}
          </div>
        </div>
      </section>

      <section className="eventDetailContentV7">
        <div className="eventDetailStoryV7">
          <small>{t.about}</small>
          {paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
          {localized.galleryImages.length>0&&<div className="eventDetailGalleryV7">
            {localized.galleryImages.map((image,index)=><figure key={image+index}><img src={image} alt={localized.title+" "+(index+1)}/></figure>)}
          </div>}
        </div>

        <aside className="eventDetailCardV7">
          <small>{t.agenda}</small>
          <h2>{localized.title}</h2>
          <div><CalendarDays size={16}/><span><b>{t.start}</b>{localized.startsAt.toLocaleString(localeTag,{dateStyle:"medium",timeStyle:"short"})}</span></div>
          {localized.endsAt&&<div><Clock3 size={16}/><span><b>{t.end}</b>{localized.endsAt.toLocaleString(localeTag,{dateStyle:"medium",timeStyle:"short"})}</span></div>}
          {localized.venue&&<div><MapPin size={16}/><span><b>{t.place}</b>{localized.venue}{localized.address&&<small>{localized.address}</small>}</span></div>}
          {localized.ctaLabel&&localized.ctaHref
            ?<a className="eventDetailActionV7" href={localized.ctaHref}>{localized.ctaLabel}<ArrowRight size={16}/></a>
            :<Link className="eventDetailActionV7" href="/reservar">{t.stay} <ArrowRight size={16}/></Link>}
        </aside>
      </section>
    </article>
  </PublicSiteChrome>;
}
