import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Coffee,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wifi
} from "lucide-react";
import type {
  Accommodation,
  BlogPost,
  Media,
  Promotion,
  SiteSection,
  SiteSettings
} from "@prisma/client";

type Props={
  sections:SiteSection[];
  settings:SiteSettings|null;
  rooms:Accommodation[];
  promo:Promotion|null;
  posts:BlogPost[];
  media:Media[];
  whatsappHref:string|null;
};

function themeClass(section:SiteSection){
  return `siteBlock siteTheme-${section.theme.toLowerCase()} siteLayout-${section.layout.toLowerCase()}`;
}

function lines(value:string|null|undefined){
  return String(value||"")
    .split(/\r?\n/)
    .map(item=>item.trim())
    .filter(Boolean);
}

function fallbackHeroImage(rooms:Accommodation[],media:Media[]){
  return rooms.find(room=>room.featured&&room.coverImage)?.coverImage
    ||rooms.find(room=>room.coverImage)?.coverImage
    ||media[0]?.url
    ||null;
}

export default function SiteBuilderRenderer({
  sections,
  settings,
  rooms,
  promo,
  posts,
  media,
  whatsappHref
}:Props){
  return <>
    <div className="siteBuilderPublic">
      {sections.map(section=>{
        if(section.type==="HERO"){
          const image=section.imageUrl||fallbackHeroImage(rooms,media);
          const title=section.title||settings?.tagline||"Seu lugar perto de tudo. Do seu jeito.";
          const body=section.body||(
            promo
              ? `${promo.title}${promo.description?" — "+promo.description:""}`
              : "Uma hospedagem leve, prática e acolhedora para descansar, explorar e viver Praia Grande."
          );
          return <section className={`${themeClass(section)} siteHeroV4`} key={section.id}>
            <div className="siteHeroCopy">
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              {section.subtitle&&<div className="siteHeroKicker">{section.subtitle}</div>}
              <h1>{title}</h1>
              <p>{body}</p>
              <div className="siteHeroActions">
                {section.ctaLabel&&section.ctaHref&&<Link className="sitePrimaryCta" href={section.ctaHref}>
                  {section.ctaLabel}<ArrowRight size={18}/>
                </Link>}
                {section.secondaryCtaLabel&&section.secondaryCtaHref&&<Link className="siteSecondaryCta" href={section.secondaryCtaHref}>
                  {section.secondaryCtaLabel}
                </Link>}
              </div>
              <div className="siteHeroSignals">
                <span><ShieldCheck size={14}/> Reserva direta</span>
                <span><MapPin size={14}/> Praia Grande</span>
                <span><Star size={14}/> Experiência Moriah</span>
              </div>
            </div>
            <div className="siteHeroVisual">
              {image?<img src={image} alt={section.imageAlt||"Pousada Moriah em Praia Grande"}/>:<div className="siteHeroPlaceholder">M</div>}
              <div className="siteHeroVisualTag">
                <small>MORIAH / EXPERIENCE</small>
                <b>Hospedagem com identidade.</b>
              </div>
            </div>
          </section>;
        }

        if(section.type==="ACCOMMODATIONS"){
          return <section id="hospedagem" className={`${themeClass(section)} siteStaysV4`} key={section.id}>
            <div className="siteSectionIntro">
              <div>
                {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
                <h2>{section.title||"Hospedagem sem complicação."}</h2>
              </div>
              <p>{section.body||"Quartos pensados para aproveitar Praia Grande com conforto, praticidade e uma experiência direta."}</p>
            </div>
            <div className="siteStayGrid">
              {rooms.map((room,index)=><article className="siteStayCard" key={room.id}>
                <div className="siteStayImageWrap">
                  {room.coverImage?<img src={room.coverImage} alt={room.name}/>:<div className="siteStayImagePlaceholder"><BedDouble size={30}/></div>}
                  <span>{String(index+1).padStart(2,"0")}</span>
                </div>
                <div className="siteStayBody">
                  <div className="siteStayMeta">
                    <small>{room.type}</small>
                    <small>até {room.capacity} hóspede(s)</small>
                  </div>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                  <Link href="/reservar">
                    {room.priceCents!=null
                      ?"A partir de "+(room.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
                      :"Consultar disponibilidade"} <ArrowRight size={15}/>
                  </Link>
                </div>
              </article>)}
            </div>
          </section>;
        }

        if(section.type==="GALLERY"){
          const urls=section.mediaUrls.length?section.mediaUrls:media.slice(0,6).map(item=>item.url);
          if(!urls.length)return null;
          return <section className={`${themeClass(section)} siteGalleryV4`} key={section.id}>
            <div className="siteSectionIntro">
              <div>
                {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
                <h2>{section.title||"Um pouco do seu próximo descanso."}</h2>
              </div>
              {section.body&&<p>{section.body}</p>}
            </div>
            <div className="siteGalleryGrid">
              {urls.slice(0,6).map((url,index)=><figure key={url+index} className={`siteGalleryTile tile-${index+1}`}>
                <img src={url} alt={section.imageAlt||`Ambiente Moriah ${index+1}`}/>
              </figure>)}
            </div>
          </section>;
        }

        if(section.type==="TRUST"){
          const items=lines(section.body);
          const values=items.length?items:["Praia Grande, SP","Reserva direta","Atendimento acolhedor","Experiência Moriah"];
          return <section className={`${themeClass(section)} siteTrustV4`} key={section.id}>
            {values.map((item,index)=><div key={item}>
              <span>{index===0?<MapPin size={15}/>:index===1?<ShieldCheck size={15}/>:index===2?<Star size={15}/>:<Sparkles size={15}/>}</span>
              <b>{item}</b>
            </div>)}
          </section>;
        }

        if(section.type==="FEATURES"){
          const items=lines(section.body);
          const values=items.length?items:["Wi-Fi para sua estadia","Espaços de convivência",settings?.address||"Boa localização em Praia Grande"];
          return <section id="estrutura" className={`${themeClass(section)} siteFeaturesV4`} key={section.id}>
            <div>
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"O que importa, bem feito."}</h2>
              {section.subtitle&&<p>{section.subtitle}</p>}
            </div>
            <div className="siteFeatureList">
              {values.map((item,index)=><div key={item}>
                <span>{index===0?<Wifi/>:index===1?<Coffee/>:<MapPin/>}</span>
                <b>{item}</b>
                <small>0{index+1}</small>
              </div>)}
            </div>
          </section>;
        }

        if(section.type==="FOOD"){
          const image=section.imageUrl||media.find(item=>item.alt?.toLowerCase().includes("restaurante"))?.url||null;
          return <section className={`${themeClass(section)} siteFoodV4`} key={section.id}>
            <div className="siteFoodCopy">
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"Comida boa também faz parte da estadia."}</h2>
              <p>{section.body||"Conheça o cardápio e peça direto pelo restaurante Moriah."}</p>
              {section.ctaLabel&&section.ctaHref&&<Link className="sitePrimaryCta" href={section.ctaHref}>
                <UtensilsCrossed size={18}/>{section.ctaLabel}
              </Link>}
            </div>
            <div className="siteFoodVisual">
              {image?<img src={image} alt={section.imageAlt||"Moriah Food"}/>:<div className="siteFoodPlaceholder"><UtensilsCrossed size={54}/></div>}
            </div>
          </section>;
        }

        if(section.type==="BLOG"){
          if(!posts.length)return null;
          return <section className={`${themeClass(section)} siteBlogV4`} key={section.id}>
            <div className="siteSectionIntro">
              <div>
                {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
                <h2>{section.title||"Journal Moriah."}</h2>
              </div>
              {section.ctaLabel&&section.ctaHref&&<Link className="siteTextLink" href={section.ctaHref}>{section.ctaLabel} <ArrowRight size={15}/></Link>}
            </div>
            <div className="siteBlogGrid">
              {posts.map((post,index)=><article key={post.id}>
                {post.coverImage&&<img src={post.coverImage} alt={post.title}/>}
                <small>JOURNAL / {String(index+1).padStart(2,"0")}</small>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <Link href={"/blog/"+post.slug}>Ler matéria <ArrowRight size={15}/></Link>
              </article>)}
            </div>
          </section>;
        }

        if(section.type==="CTA"){
          return <section className={`${themeClass(section)} siteCtaV4`} key={section.id}>
            <div className="siteCtaActions">
              <div>
                {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
                <h2>{section.title||"Faça da Moriah a sua base."}</h2>
               {section.body&&<p>{section.body}</p>}
              </div>
              <div className="siteCtaActions">
                {section.ctaLabel&&section.ctaHref&&<Link className="sitePrimaryCta" href={section.ctaHref}>
                  {section.ctaLabel}<ArrowRight size={18}/>
                </Link>}
                {section.secondaryCtaLabel&&section.secondaryCtaHref&&<Link className="siteSecondaryCta" href={section.secondaryCtaHref}>
                  {section.secondaryCtaLabel}
                </Link>}
              </div>
            </div>
          </section>;
        }

        if(section.type==="RICH_TEXT"){
          return <section className={`${themeClass(section)} siteRichTextV4`} key={section.id}>
            <div>
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"Moriah"}</h2>
              {section.subtitle&&<h3>{section.subtitle}</h3>}
            </div>
            <div className="siteRichBody">
              {lines(section.body).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
              {section.ctaLabel&&section.ctaHref&&<Link className="siteTextLink" href={section.ctaHref}>{section.ctaLabel} <ArrowRight size={15}/></Link>}
            </div>
          </section>;
        }

        return null;
      })}
    </div>

    {whatsappHref&&<a className="whatsappFloat" href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Falar com a Pousada Moriah pelo WhatsApp">
      <MessageCircle size={23}/><span>Fale conosco</span>
    </a>}
  </>;
}
