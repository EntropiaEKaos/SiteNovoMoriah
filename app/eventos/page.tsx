import Link from "next/link";
import {ArrowRight,CalendarDays,MapPin,Sparkles} from "lucide-react";
import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";
import PublicSiteChrome from "../public-site-chrome";

export const dynamic="force-dynamic";

export default async function Page(){
  const locale=await getSiteLocale();
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"
    ?{eyebrow:"MORIAH EXPERIENCE",title:"Live the Moriah agenda.",body:"Food, gatherings, music and seasonal experiences for guests and the local community.",cta:"See experience",empty:"New experiences are being prepared."}
    :locale==="es"
      ?{eyebrow:"EXPERIENCIA MORIAH",title:"Vive la agenda de Moriah.",body:"Gastronomía, encuentros, música y experiencias de temporada para huéspedes y comunidad.",cta:"Ver experiencia",empty:"Nuevas experiencias en preparación."}
      :{eyebrow:"MORIAH EXPERIENCE",title:"Viva a agenda da Moriah.",body:"Gastronomia, encontros, música e experiências sazonais para hóspedes e comunidade.",cta:"Ver experiência",empty:"Novas experiências em preparação."};

  const [events,settings,navPages]=await Promise.all([
    prisma.moriahEvent.findMany({where:{published:true},orderBy:[{featured:"desc"},{startsAt:"asc"}]}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const localizedSettings=localizeRecord(settings,locale);
  const localizedNavPages=navPages.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const localizedEvents=events.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const now=new Date();
  const upcoming=localizedEvents.filter(event=>(event.endsAt||new Date(event.startsAt.getTime()+86400000))>=now);

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <section className="eventsArchiveV7">
      <header className="eventsArchiveHeroV7">
        <small>{t.eyebrow}</small>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
      </header>
      <div className="eventsArchiveGridV7">
        {upcoming.map(event=><article className="eventsArchiveCardV7" key={event.id}>
          <Link href={"/eventos/"+event.slug} className="eventsArchiveMediaV7">
            {event.coverImage?<img src={event.coverImage} alt={event.title}/>:<div><Sparkles size={46}/></div>}
            {event.badge&&<b>{event.badge}</b>}
          </Link>
          <div className="eventsArchiveBodyV7">
            <small>{event.category}</small>
            <h2><Link href={"/eventos/"+event.slug}>{event.title}</Link></h2>
            <p>{event.summary||event.description.slice(0,210)}</p>
            <div className="eventsArchiveMetaV7">
              <span><CalendarDays size={14}/>{event.startsAt.toLocaleString(localeTag,{dateStyle:"medium",timeStyle:"short"})}</span>
              {event.venue&&<span><MapPin size={14}/>{event.venue}</span>}
            </div>
            <Link className="eventsArchiveCtaV7" href={"/eventos/"+event.slug}>{t.cta} <ArrowRight size={16}/></Link>
          </div>
        </article>)}
      </div>
      {!upcoming.length&&<div className="eventsEmptyV7"><Sparkles/><h2>{t.empty}</h2></div>}
    </section>
  </PublicSiteChrome>;
}
