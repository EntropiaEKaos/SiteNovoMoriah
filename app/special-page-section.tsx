type SectionLike={
  id?:string;
  type:string;
  eyebrow:string|null;
  title:string|null;
  subtitle:string|null;
  body:string|null;
  imageUrl:string|null;
  ctaLabel:string|null;
  ctaHref:string|null;
  secondaryCtaLabel:string|null;
  secondaryCtaHref:string|null;
  anchorId:string|null;
  backgroundColor:string|null;
  textColor:string|null;
  theme:string;
  layout:string;
};

function lines(value:string|null|undefined){
  return String(value||"").split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
}

export default function SpecialPageSection({section}:{section:SectionLike}){
  const items=lines(section.body).map(line=>{
    const [title,...rest]=line.split("|").map(part=>part.trim());
    return {title,description:rest.join(" | ")};
  });

  return <section
    id={section.anchorId||undefined}
    className={"specialVisualSection theme-"+String(section.theme||"LIGHT").toLowerCase()+" layout-"+String(section.layout||"DEFAULT").toLowerCase()}
    style={{
      ...(section.backgroundColor?{backgroundColor:section.backgroundColor}:{}),
      ...(section.textColor?{color:section.textColor}:{}),
      ...(section.imageUrl?{
        backgroundImage:"linear-gradient(90deg,rgba(0,0,0,.65),rgba(0,0,0,.25)),url("+section.imageUrl+")",
        backgroundSize:"cover",
        backgroundPosition:"center"
      }:{})
    }}
  >
    <div className="specialVisualInner">
      {section.eyebrow&&<small>{section.eyebrow}</small>}
      {section.title&&<h2>{section.title}</h2>}
      {section.subtitle&&<p className="specialVisualLead">{section.subtitle}</p>}

      {items.length>0&&(section.type==="FAQ"||section.type==="STATS"||section.type==="FEATURES"||section.type==="TESTIMONIALS")
        ?<div className="specialVisualGrid">
          {items.map((item,index)=><article key={item.title+index}>
            <span>{String(index+1).padStart(2,"0")}</span>
            <h3>{item.title}</h3>
            {item.description&&<p>{item.description}</p>}
          </article>)}
        </div>
        :section.body&&<div className="specialVisualBody">{lines(section.body).map((item,index)=><p key={index}>{item}</p>)}</div>
      }

      {(section.ctaHref||section.secondaryCtaHref)&&<div className="specialVisualActions">
        {section.ctaHref&&<a href={section.ctaHref}>{section.ctaLabel||"Saiba mais"} →</a>}
        {section.secondaryCtaHref&&<a className="secondary" href={section.secondaryCtaHref}>{section.secondaryCtaLabel||"Ver mais"} →</a>}
      </div>}
    </div>
  </section>;
}
