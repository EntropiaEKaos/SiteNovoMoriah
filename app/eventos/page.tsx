import type {CSSProperties} from "react";
import Link from "next/link";
import {ArrowRight,CalendarDays,MapPin,Sparkles} from "lucide-react";
import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import PublicSiteChrome from "../public-site-chrome";

export const dynamic="force-dynamic";

export default async function Page(){
  const [events,settings,navPages]=await Promise.all([
    prisma.moriahEvent.findMany({
      where:{published:true},
      orderBy:[{featured:"desc"},{startsAt:"asc"}]
    }),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const now=new Date();
  const upcoming=events.filter(event=>
    (event.endsAt||new Date(event.startsAt.getTime()+24*60*60_000))>=now
  );

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    <section className="eventsArchiveV7">
      <header className="eventsArchiveHeroV7">
        <small>MORIAH EXPERIENCE</small>
        <h1>Viva a agenda da Moriah.</h1>
        <p>Gastronomia, encontros, música e experiências sazonais para hóspedes e comunidade.</p>
      </header>

      <div className="eventsArchiveGridV7">
        {upcoming.map(event=>{
          const style={
            "--event-primary":event.themePrimaryColor,
            "--event-secondary":event.themeSecondaryColor,
            "--event-accent":event.themeAccentColor,
            "--event-bg":event.themeBackgroundColor,
            "--event-text":event.themeTextColor
          } as CSSProperties;

          return <article
            className={"eventsArchiveCardV7 eventPreset-"+event.themePreset.toLowerCase()}
            style={style}
            key={event.id}
          >
            <Link href={"/eventos/"+event.slug} className="eventsArchiveMediaV7">
              {event.coverImage
                ?<img src={event.coverImage} alt={event.title}/>
                :<div><Sparkles size={46}/></div>}
              {event.badge&&<b>{event.badge}</b>}
            </Link>

            <div className="eventsArchiveBodyV7">
              <small>{event.category}</small>
              <h2><Link href={"/eventos/"+event.slug}>{event.title}</Link></h2>
              <p>{event.summary||event.description.slice(0,210)}</p>
              <div className="eventsArchiveMetaV7">
                <span><CalendarDays size={14}/>{event.startsAt.toLocaleString("pt-BR",{dateStyle:"medium",timeStyle:"short"})}</span>
                {event.venue&&<span><MapPin size={14}/>{event.venue}</span>}
              </div>
              <Link className="eventsArchiveCtaV7" href={"/eventos/"+event.slug}>
                Ver experiência <ArrowRight size={16}/>
              </Link>
            </div>
          </article>;
        })}
      </div>

      {!upcoming.length&&<div className="eventsEmptyV7">
        <Sparkles/>
        <h2>Novas experiências em preparação.</h2>
      </div>}
    </section>
  </PublicSiteChrome>;
}
