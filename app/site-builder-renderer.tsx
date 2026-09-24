import Link from "next/link";
import type {CSSProperties} from "react";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Coffee,
  HelpCircle,
  MapPin,
  MessageCircle,
  Play,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
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

function lines(value:string|null|undefined){
  return String(value||"")
    .split(/\r?\n/)
    .map(item=>item.trim())
    .filter(Boolean);
}

function cells(value:string|null|undefined){
  return lines(value).map(line=>line.split("|").map(part=>part.trim()));
}

function fallbackHeroImage(rooms:Accommodation[],media:Media[]){
  return rooms.find(room=>room.featured&&room.coverImage)?.coverImage
    ||rooms.find(room=>room.coverImage)?.coverImage
    ||media[0]?.url
    ||null;
}

function blockProps(section:SiteSection,extra:string,fallbackId?:string){
  const animation=section.animation||"FADE_UP";
  const animationDelay=Number.isFinite(section.animationDelay)?section.animationDelay:0;
  const paddingY=Number.isFinite(section.paddingY)?section.paddingY:96;
  const contentWidth=section.contentWidth||"NORMAL";
  const theme=section.theme||"LIGHT";
  const layout=section.layout||"DEFAULT";

  const style={
    "--site-section-delay":animationDelay+"ms",
    paddingTop:paddingY,
    paddingBottom:paddingY,
    ...(section.backgroundColor?{backgroundColor:section.backgroundColor}:{}),
    ...(section.textColor?{color:section.textColor}:{}),
    ...(section.backgroundImageUrl?{
      backgroundImage:
        "linear-gradient(90deg,rgba(0,0,0,.10),rgba(0,0,0,.10)),url("+section.backgroundImageUrl+")",
      backgroundSize:"cover",
      backgroundPosition:"center"
    }:{})
  } as CSSProperties;

  const classes=[
    "siteBlock",
    "siteTheme-"+theme.toLowerCase(),
    "siteLayout-"+layout.toLowerCase(),
    "siteContentWidth-"+contentWidth.toLowerCase(),
    "siteMotion-"+animation.toLowerCase(),
    section.hideMobile?"siteHideMobile":"",
    section.hideDesktop?"siteHideDesktop":"",
    extra
  ].filter(Boolean).join(" ");

  return {
    id:section.anchorId||fallbackId,
    className:classes,
    style
  };
}

function youtubeEmbed(value:string|null){
  if(!value)return null;
  try{
    const url=new URL(value);
    if(url.hostname==="youtu.be"){
      const id=url.pathname.replace("/","").slice(0,32);
      return id?"https://www.youtube.com/embed/"+id:null;
    }
    if(url.hostname.includes("youtube.com")){
      const id=url.searchParams.get("v");
      return id?"https://www.youtube.com/embed/"+id:null;
    }
    if(url.hostname.includes("vimeo.com")){
      const id=url.pathname.split("/").filter(Boolean).at(-1);
      return id?"https://player.vimeo.com/video/"+id:null;
    }
  }catch{}
  return null;
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
  return <div className="siteBuilderPublic">
    {sections.map(section=>{
      if(section.type==="HERO"){
        const image=section.imageUrl||settings?.defaultBackgroundImageUrl||fallbackHeroImage(rooms,media);
        const title=section.title||settings?.tagline||"Seu lugar perto de tudo. Do seu jeito.";
        const body=section.body||(
          promo
            ?promo.title+(promo.description?" — "+promo.description:"")
            :"Uma hospedagem leve, prática e acolhedora para descansar, explorar e viver Praia Grande."
        );

        return <section {...blockProps(section,"siteHeroV4","inicio")} key={section.id}>
          <div className="siteHeroBackdrop">
            {image?<img src={image} alt={section.imageAlt||"Pousada Moriah em Praia Grande"}/>:<div className="siteHeroPlaceholder">M</div>}
          </div>
          <div className="siteHeroCopy">
            <div className="siteHeroLocation"><MapPin size={15}/> Praia Grande, SP</div>
            {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
            <h1>{title}</h1>
            <p>{body}</p>
            <form action="/reservar" method="get" className="siteSearchBar">
              <label>
                <span><CalendarDays size={16}/> Check-in</span>
                <input type="date" name="checkIn" required/>
              </label>
              <label>
                <span><CalendarDays size={16}/> Check-out</span>
                <input type="date" name="checkOut" required/>
              </label>
              <label>
                <span><Users size={16}/> Hóspedes</span>
                <input type="number" name="guests" min="1" max="50" defaultValue="2" required/>
              </label>
              <button type="submit"><Search size={18}/> Buscar hospedagem</button>
            </form>
            <div className="siteHeroSignals">
              <span><ShieldCheck size={15}/> Reserva direta</span>
              <span><CheckCircle2 size={15}/> Atendimento da própria pousada</span>
              <span><Star size={15}/> Experiência Moriah</span>
            </div>
          </div>
        </section>;
      }

      if(section.type==="ACCOMMODATIONS"){
        return <section {...blockProps(section,"siteStaysV4","hospedagem")} key={section.id}>
          <div className="siteSectionIntro">
            <div>
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"Hospedagem sem complicação."}</h2>
            </div>
            <p>{section.body||"Quartos pensados para aproveitar Praia Grande com conforto, praticidade e uma experiência direta."}</p>
          </div>
          <div className="siteStayGrid">
            {rooms.map((room,index)=><article className="siteStayCard" key={room.id}>
              <Link className="siteStayImageWrap" href={"/hospedagens/"+room.id} aria-label={"Ver detalhes de "+room.name}>
                {room.coverImage?<img src={room.coverImage} alt={room.name}/>:<div className="siteStayImagePlaceholder"><BedDouble size={30}/></div>}
                {room.featured&&<span className="siteStayFeatured">Recomendado</span>}
                <span className="siteStayIndex">{String(index+1).padStart(2,"0")}</span>
              </Link>
              <div className="siteStayBody">
                <div className="siteStayMeta">
                  <small>{room.sharedRoom?"Quarto compartilhado":room.type}</small>
                  <small><Users size={12}/> {room.sharedRoom?room.bedCount+" cama(s)":("até "+room.capacity+" hóspede(s)")}</small>
                </div>
                <h3><Link className="siteStayTitleLink" href={"/hospedagens/"+room.id}>{room.name}</Link></h3>
                <p>{room.description}</p>
                {room.amenities.length>0&&<div className="siteStayAmenities">
                  {room.amenities.slice(0,3).map(item=><span key={item}><CheckCircle2 size={13}/>{item}</span>)}
                </div>}
                <div className="siteStayOffer">
                  <div>
                    <small>{room.priceCents!=null?"A partir de":"Tarifa"}</small>
                    <strong>{room.priceCents!=null
                      ?(room.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
                      :"Sob consulta"}</strong>
                    <span>{room.sharedRoom?"valor por cama / noite":"Reserva direta com a Moriah"}</span>
                  </div>
                  <Link href={"/reservar?accommodationId="+room.id}>
                    {room.sharedRoom?"Ver camas disponíveis":"Ver disponibilidade"} <ArrowRight size={15}/>
                  </Link>
                </div>
              </div>
            </article>)}
          </div>
        </section>;
      }

      if(section.type==="GALLERY"){
        const urls=section.mediaUrls.length?section.mediaUrls:media.slice(0,6).map(item=>item.url);
        if(!urls.length)return null;
        return <section {...blockProps(section,"siteGalleryV4")} key={section.id}>
          <div className="siteSectionIntro">
            <div>
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"Um pouco do seu próximo descanso."}</h2>
            </div>
            {section.body&&<p>{section.body}</p>}
          </div>
          <div className="siteGalleryGrid">
            {urls.slice(0,12).map((url,index)=><figure key={url+index} className={"siteGalleryTile tile-"+((index%6)+1)}>
              <img src={url} alt={section.imageAlt||"Ambiente Moriah "+(index+1)}/>
            </figure>)}
          </div>
        </section>;
      }

      if(section.type==="TRUST"){
        const items=lines(section.body);
        const values=items.length?items:["Praia Grande, SP","Reserva direta","Atendimento acolhedor","Experiência Moriah"];
        return <section {...blockProps(section,"siteTrustV4")} key={section.id}>
          {values.map((item,index)=><div key={item}>
            <span>{index===0?<MapPin size={15}/>:index===1?<ShieldCheck size={15}/>:index===2?<Star size={15}/>:<Sparkles size={15}/>}</span>
            <b>{item}</b>
          </div>)}
        </section>;
      }

      if(section.type==="FEATURES"){
        const items=lines(section.body);
        const values=items.length?items:["Wi-Fi para sua estadia","Espaços de convivência",settings?.address||"Boa localização em Praia Grande"];
        return <section {...blockProps(section,"siteFeaturesV4","estrutura")} key={section.id}>
          <div>
            {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
            <h2>{section.title||"O que importa, bem feito."}</h2>
            {section.subtitle&&<p>{section.subtitle}</p>}
          </div>
          <div className="siteFeatureList">
            {values.map((item,index)=><div key={item}>
              <span>{index%3===0?<Wifi/>:index%3===1?<Coffee/>:<MapPin/>}</span>
              <b>{item}</b>
              <small>{String(index+1).padStart(2,"0")}</small>
            </div>)}
          </div>
        </section>;
      }

      if(section.type==="FOOD"){
        const image=section.imageUrl||media.find(item=>item.alt?.toLowerCase().includes("restaurante"))?.url||null;
        return <section {...blockProps(section,"siteFoodV4")} key={section.id}>
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
        return <section {...blockProps(section,"siteBlogV4")} key={section.id}>
          <div className="siteSectionIntro">
            <div>
              {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
              <h2>{section.title||"Journal Moriah."}</h2>
            </div>
            {section.body&&<p>{section.body}</p>}
          </div>
          <div className="siteBlogGrid">
            {posts.map(post=><article key={post.id}>
              {post.coverImage&&<img src={post.coverImage} alt={post.title}/>}
              <small>{post.publishedAt?.toLocaleDateString("pt-BR")||"JOURNAL"}</small>
              <h3>{post.title}</h3>
              <p>{post.excerpt||post.content.slice(0,150)}</p>
              <Link href={"/blog/"+post.slug}>Ler artigo <ArrowRight size={14}/></Link>
            </article>)}
          </div>
          {section.ctaLabel&&section.ctaHref&&<div className="siteSectionAction">
            <Link className="siteSecondaryCta" href={section.ctaHref}>{section.ctaLabel}</Link>
          </div>}
        </section>;
      }

      if(section.type==="RICH_TEXT"){
        return <section {...blockProps(section,"siteRichTextV4")} key={section.id}>
          {section.imageUrl&&<div className="siteRichMedia"><img src={section.imageUrl} alt={section.imageAlt||section.title||"Moriah"}/></div>}
          <div className="siteRichCopy">
            {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
            {section.title&&<h2>{section.title}</h2>}
            {section.subtitle&&<h3>{section.subtitle}</h3>}
            {lines(section.body).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
            {(section.ctaLabel&&section.ctaHref)&&<Link className="sitePrimaryCta" href={section.ctaHref}>{section.ctaLabel}<ArrowRight size={16}/></Link>}
          </div>
        </section>;
      }

      if(section.type==="CTA"){
        return <section {...blockProps(section,"siteCtaV4")} key={section.id}>
          {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
          <h2>{section.title||"Faça da Moriah a sua base."}</h2>
          {section.body&&<p>{section.body}</p>}
          <div className="siteHeroActions">
            {section.ctaLabel&&section.ctaHref&&<Link className="sitePrimaryCta" href={section.ctaHref}>{section.ctaLabel}<ArrowRight size={18}/></Link>}
            {section.secondaryCtaLabel&&section.secondaryCtaHref&&<Link className="siteSecondaryCta" href={section.secondaryCtaHref}>{section.secondaryCtaLabel}</Link>}
          </div>
        </section>;
      }

      if(section.type==="STATS"){
        const items=cells(section.body).filter(row=>row[0]);
        return <section {...blockProps(section,"siteStatsV5")} key={section.id}>
          <div className="siteSectionIntro">
            <div>{section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}<h2>{section.title||"Moriah em números."}</h2></div>
            {section.subtitle&&<p>{section.subtitle}</p>}
          </div>
          <div className="siteStatsGrid">
            {items.map((row,index)=><div key={index}>
              <strong>{row[0]}</strong>
              <span>{row[1]||"Indicador"}</span>
              {row[2]&&<small>{row[2]}</small>}
            </div>)}
          </div>
        </section>;
      }

      if(section.type==="FAQ"){
        const items=cells(section.body).filter(row=>row[0]&&row[1]);
        return <section {...blockProps(section,"siteFaqV5")} key={section.id}>
          <div className="siteSectionIntro">
            <div>{section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}<h2>{section.title||"Perguntas frequentes."}</h2></div>
            {section.subtitle&&<p>{section.subtitle}</p>}
          </div>
          <div className="siteFaqList">
            {items.map((row,index)=><details key={index}>
              <summary><span><HelpCircle size={17}/>{row[0]}</span><b>+</b></summary>
              <p>{row.slice(1).join(" | ")}</p>
            </details>)}
          </div>
        </section>;
      }

      if(section.type==="TESTIMONIALS"){
        const items=cells(section.body).filter(row=>row[0]&&row[1]);
        return <section {...blockProps(section,"siteTestimonialsV5")} key={section.id}>
          <div className="siteSectionIntro">
            <div>{section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}<h2>{section.title||"Quem passa pela Moriah."}</h2></div>
            {section.subtitle&&<p>{section.subtitle}</p>}
          </div>
          <div className="siteTestimonialGrid">
            {items.map((row,index)=><blockquote key={index}>
              <Quote size={24}/>
              <p>{row[1]}</p>
              <footer><b>{row[0]}</b>{row[2]&&<small>{row[2]}</small>}</footer>
            </blockquote>)}
          </div>
        </section>;
      }

      if(section.type==="CONTACT"){
        return <section {...blockProps(section,"siteContactV5","fale-conosco")} key={section.id}>
          <div>
            {section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}
            <h2>{section.title||"Fale com a Moriah."}</h2>
            <p>{section.body||"Nossa equipe está pronta para ajudar com sua estadia."}</p>
          </div>
          <div className="siteContactCards">
            <div><MapPin/><small>ENDEREÇO</small><b>{settings?.address||"Praia Grande — SP"}</b></div>
            {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle/><small>WHATSAPP</small><b>Falar com a equipe</b></a>}
            {section.ctaLabel&&section.ctaHref&&<Link href={section.ctaHref}><ArrowRight/><small>PRÓXIMO PASSO</small><b>{section.ctaLabel}</b></Link>}
          </div>
        </section>;
      }

      if(section.type==="VIDEO"){
        const embed=youtubeEmbed(section.videoUrl);
        return <section {...blockProps(section,"siteVideoV5")} key={section.id}>
          <div className="siteSectionIntro">
            <div>{section.eyebrow&&<div className="siteEyebrow">{section.eyebrow}</div>}<h2>{section.title||"Conheça a Moriah em movimento."}</h2></div>
            {section.body&&<p>{section.body}</p>}
          </div>
          <div className="siteVideoFrame">
            {embed?<iframe
              src={embed}
              title={section.title||"Vídeo Moriah"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />:section.videoUrl?<a href={section.videoUrl} target="_blank" rel="noreferrer" className="siteVideoFallback">
              {section.imageUrl&&<img src={section.imageUrl} alt={section.imageAlt||section.title||"Vídeo"}/>}
              <span><Play/> Abrir vídeo</span>
            </a>:<div className="siteVideoPlaceholder"><Play size={44}/><b>Adicione uma URL de vídeo no Site Studio.</b></div>}
          </div>
        </section>;
      }

      return null;
    })}
  </div>;
}
