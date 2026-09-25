import type {Metadata} from "next";
import {loadSpecialSections,corporateSeed} from "../../lib/special-site-pages";
import SpecialPageSection from "../special-page-section";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Café da manhã para sua obra | Restaurante Moriah",
  description:"Café da manhã corporativo entregue diretamente na obra, com atendimento, suco e recolhimento."
};

function rows(value:string|null|undefined){
  return String(value||"").split(/\r?\n/).map(line=>{
    const [title,...rest]=line.split("|").map(part=>part.trim());
    return {title,description:rest.join(" | ")};
  }).filter(item=>item.title);
}

export default async function CorporatePage(){
  const {sections}=await loadSpecialSections("corporativo",corporateSeed.sections);
  const hero=sections.find(section=>section.type==="HERO")||sections[0];
  const process=sections.find(section=>section.anchorId==="como-funciona")||sections.find(section=>section.type==="FEATURES");
  const benefits=sections.find(section=>section.anchorId==="beneficios")||sections.find(section=>section.type==="STATS");
  const quote=sections.find(section=>section.type==="TESTIMONIALS");
  const offer=sections.find(section=>section.type==="CTA");
  const extraSections=sections.filter(section=>section!==hero&&section!==process&&section!==benefits&&section!==quote&&section!==offer);

  return <main className="corporateLanding">
    <header className="corporateTop">
      <a href="/" className="corporateBrand"><span>M</span><div><b>RESTAURANTE MORIAH</b><small>CORPORATIVO</small></div></a>
      <nav><a href="#como-funciona">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#proposta">Proposta</a></nav>
      <a className="corporateTopCta" href="https://wa.me/5511978492432" target="_blank" rel="noreferrer">Falar com a Moriah ↗</a>
    </header>

    <section className="corporateHero" style={hero?.imageUrl?{backgroundImage:"linear-gradient(90deg,rgba(8,8,8,.9),rgba(8,8,8,.45)),url("+hero.imageUrl+")"}:undefined}>
      <div>
        <small>{hero?.eyebrow}</small>
        <h1>{hero?.title}</h1>
        <h2>{hero?.subtitle}</h2>
        <p>{hero?.body}</p>
        <a href={hero?.ctaHref||"https://wa.me/5511978492432"} target="_blank" rel="noreferrer">{hero?.ctaLabel||"Solicitar proposta"} →</a>
      </div>
      <aside>
        <span>01</span>
        <b>Pontualidade</b>
        <span>02</span>
        <b>Higiene</b>
        <span>03</span>
        <b>Organização</b>
      </aside>
    </section>

    {process&&<section className="corporateProcess" id="como-funciona">
      <header><small>{process.eyebrow}</small><h2>{process.title}</h2><p>{process.subtitle}</p></header>
      <div>
        {rows(process.body).map((item,index)=><article key={item.title+index}>
          <span>{String(index+1).padStart(2,"0")}</span>
          <h3>{item.title.replace(/^\d+\s*[•.-]?\s*/,"")}</h3>
          <p>{item.description}</p>
        </article>)}
      </div>
    </section>}

    {benefits&&<section className="corporateBenefits" id="beneficios">
      <header><small>{benefits.eyebrow}</small><h2>{benefits.title}</h2></header>
      <div>{rows(benefits.body).map((item,index)=><article key={item.title+index}><b>{item.title}</b><p>{item.description}</p></article>)}</div>
    </section>}

    {extraSections.map((section,index)=><SpecialPageSection key={"corporate-extra-"+index} section={section}/>)}

    {quote&&<section className="corporateQuote">
      <span>“</span>
      <blockquote>{quote.title}</blockquote>
      <p>{quote.body}</p>
      <small>RESTAURANTE MORIAH</small>
    </section>}

    {offer&&<section className="corporateOffer" id="proposta">
      <div className="corporateOfferCopy">
        <small>{offer.eyebrow}</small><h2>{offer.title}</h2>
        <strong>{offer.subtitle}</strong>
        <span>por pessoa</span>
      </div>
      <div className="corporateOfferItems">
        {rows(offer.body).map(item=><div key={item.title}><i>✓</i><p><b>{item.title}</b><span>{item.description}</span></p></div>)}
      </div>
      <a href={offer.ctaHref||"https://wa.me/5511978492432"} target="_blank" rel="noreferrer">{offer.ctaLabel||"Falar no WhatsApp"} →</a>
    </section>}

    <footer className="corporateFooter">
      <div><b>RESTAURANTE MORIAH</b><span>Café da manhã corporativo para equipes e obras.</span></div>
      <a href="https://wa.me/5511978492432" target="_blank" rel="noreferrer">(11) 97849-2432 ↗</a>
    </footer>
  </main>;
}
