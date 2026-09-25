import type {CSSProperties} from "react";
import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight,CalendarDays,Clock3,MapPin,Sparkles} from "lucide-react";
import {prisma} from "../../../lib/prisma";
import {loadPublicSiteSettings} from "../../../lib/public-site-settings";
import PublicSiteChrome from "../../public-site-chrome";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const event=await prisma.moriahEvent.findUnique({where:{slug}});
  if(!event?.published)return {};
  return {
    title:event.title+" | Eventos Moriah",
    description:event.summary||event.description.slice(0,160),
    openGraph:event.coverImage?{images:[event.coverImage]}:undefined
  };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const [event,settings,navPages]=await Promise.all([
    prisma.moriahEvent.findUnique({where:{slug}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  if(!event?.published)notFound();

  const paragraphs=event.description.split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const style={
    "--event-primary":event.themePrimaryColor,
    "--event-secondary":event.themeSecondaryColor,
    "--event-accent":event.themeAccentColor,
    "--event-bg":event.themeBackgroundColor,
    "--event-text":event.themeTextColor
  } as CSSProperties;

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    <article
      className={"eventDetailV7 eventPreset-"+event.themePreset.toLowerCase()}
      style={style}
    >
      <section className="eventDetailHeroV7">
        <div className="eventDetailBackdropV7">
          {event.coverImage
            ?<img src={event.coverImage} alt={event.title}/>
            :<div><Sparkles size={62}/></div>}
        </div>
        <div className="eventDetailOverlayV7"/>
        <div className="eventDetailHeroCopyV7">
          <Link href="/eventos">← Agenda Moriah</Link>
          <small>{event.eyebrow||event.category}</small>
          {event.badge&&<b>{event.badge}</b>}
          <h1>{event.title}</h1>
          {event.summary&&<p>{event.summary}</p>}
          <div className="eventDetailHeroMetaV7">
            <span><CalendarDays size={16}/>{event.startsAt.toLocaleString("pt-BR",{dateStyle:"long",timeStyle:"short"})}</span>
            {event.venue&&<span><MapPin size={16}/>{event.venue}</span>}
            {event.priceLabel&&<span><Sparkles size={16}/>{event.priceLabel}</span>}
          </div>
        </div>
      </section>

      <section className="eventDetailContentV7">
        <div className="eventDetailStoryV7">
          <small>SOBRE A EXPERIÊNCIA</small>
          {paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
          {event.galleryImages.length>0&&<div className="eventDetailGalleryV7">
            {event.galleryImages.map((image,index)=><figure key={image+index}>
              <img src={image} alt={event.title+" "+(index+1)}/>
            </figure>)}
          </div>}
        </div>

        <aside className="eventDetailCardV7">
          <small>AGENDA</small>
          <h2>{event.title}</h2>
          <div>
            <CalendarDays size={16}/>
            <span><b>Início</b>{event.startsAt.toLocaleString("pt-BR",{dateStyle:"medium",timeStyle:"short"})}</span>
          </div>
          {event.endsAt&&<div>
            <Clock3 size={16}/>
            <span><b>Encerramento</b>{event.endsAt.toLocaleString("pt-BR",{dateStyle:"medium",timeStyle:"short"})}</span>
          </div>}
          {event.venue&&<div>
            <MapPin size={16}/>
            <span><b>Local</b>{event.venue}{event.address&&<small>{event.address}</small>}</span>
          </div>}
          {event.ctaLabel&&event.ctaHref
            ?<a className="eventDetailActionV7" href={event.ctaHref}>{event.ctaLabel}<ArrowRight size={16}/></a>
            :<Link className="eventDetailActionV7" href="/reservar">Hospede-se na Moriah <ArrowRight size={16}/></Link>}
        </aside>
      </section>
    </article>
  </PublicSiteChrome>;
}
