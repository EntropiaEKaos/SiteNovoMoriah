import Link from "next/link";
import type {CSSProperties} from "react";
import type {MoriahEvent} from "@prisma/client";
import {ArrowRight,CalendarDays,MapPin,Sparkles} from "lucide-react";
import type {SiteLocale} from "../lib/site-i18n";

export default function EventShowcase({events,locale}:{events:MoriahEvent[];locale:SiteLocale}){
  if(!events.length)return null;
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"
    ?{title:"What’s happening at Moriah.",body:"Experiences, gatherings, food and special dates to enjoy more than a stay.",agenda:"See full schedule",experience:"Moriah experience",discover:"Discover"}
    :locale==="es"
      ?{title:"Acontece en Moriah.",body:"Experiencias, encuentros, gastronomía y fechas especiales para vivir mucho más que una estancia.",agenda:"Ver agenda completa",experience:"Experiencia Moriah",discover:"Descubrir"}
      :{title:"Acontece na Moriah.",body:"Experiências, encontros, gastronomia e datas especiais para viver mais do que uma estadia.",agenda:"Ver agenda completa",experience:"Experiência Moriah",discover:"Descobrir"};

  return <section className="siteEventsV7" id="eventos">
    <div className="siteEventsHeadV7">
      <div><small>MORIAH EXPERIENCE</small><h2>{t.title}</h2></div>
      <div><p>{t.body}</p><Link href="/eventos">{t.agenda} <ArrowRight size={16}/></Link></div>
    </div>
    <div className="siteEventsGridV7">
      {events.map((event,index)=>{
        const style={
          "--event-primary":event.themePrimaryColor,
          "--event-secondary":event.themeSecondaryColor,
          "--event-accent":event.themeAccentColor
        } as CSSProperties;
        return <article className={"siteEventCardV7 eventPreset-"+event.themePreset.toLowerCase()} style={style} key={event.id}>
          <Link href={"/eventos/"+event.slug} className="siteEventMediaV7">
            {event.coverImage?<img src={event.coverImage} alt={event.title}/>:<div className="siteEventPlaceholderV7"><Sparkles/></div>}
            <span className="siteEventNumberV7">{String(index+1).padStart(2,"0")}</span>
            {event.badge&&<b className="siteEventBadgeV7">{event.badge}</b>}
          </Link>
          <div className="siteEventBodyV7">
            <div className="siteEventMetaV7">
              <span><CalendarDays size={13}/>{event.startsAt.toLocaleDateString(localeTag,{day:"2-digit",month:"short"})}</span>
              {event.venue&&<span><MapPin size={13}/>{event.venue}</span>}
            </div>
            <small>{event.eyebrow||event.category}</small>
            <h3><Link href={"/eventos/"+event.slug}>{event.title}</Link></h3>
            <p>{event.summary||event.description.slice(0,160)}</p>
            <div className="siteEventFootV7">
              <b>{event.priceLabel||t.experience}</b>
              <Link href={"/eventos/"+event.slug}>{t.discover} <ArrowRight size={15}/></Link>
            </div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
