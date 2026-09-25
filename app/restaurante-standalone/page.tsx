import type {Metadata} from "next";
import {prisma} from "../../lib/prisma";
import {
  effectiveRestaurantPrice,
  isMenuScheduleAvailable,
  restaurantProductAvailable
} from "../../lib/restaurant-menu";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";
import {loadSpecialSections,restaurantVisualSeed} from "../../lib/special-site-pages";
import Menu from "../restaurante/menu";
import SpecialPageSection from "../special-page-section";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Restaurante Moriah | Peça online",
  description:"Cardápio online do Restaurante Moriah com pedidos conectados diretamente à cozinha."
};

function splitItems(value:string|null|undefined){
  return String(value||"").split(/\r?\n/).map(line=>{
    const [title,...rest]=line.split("|").map(part=>part.trim());
    return {title,description:rest.join(" | ")};
  }).filter(item=>item.title);
}

export default async function StandaloneRestaurant(){
  const locale=await getSiteLocale();
  const [products,settings,visual]=await Promise.all([
    prisma.restaurantProduct.findMany({
      where:{active:true,category:{active:true}},
      include:{
        category:true,
        modifierLinks:{include:{group:{include:{options:{where:{active:true},orderBy:{name:"asc"}}}}}},
        recipes:{include:{ingredient:true}}
      },
      orderBy:[
        {category:{sortOrder:"asc"}},
        {featured:"desc"},
        {sortOrder:"asc"},
        {name:"asc"}
      ]
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    loadSpecialSections("restaurante-visual",restaurantVisualSeed.sections)
  ]);

  const now=new Date();
  const localizedSettings=localizeRecord(settings,locale);
  const localizedProducts=products.map(product=>({
    ...(localizeRecord(product,locale)||product),
    category:localizeRecord(product.category,locale)||product.category,
    modifierLinks:product.modifierLinks.map(link=>({
      ...link,
      group:{
        ...(localizeRecord(link.group,locale)||link.group),
        options:link.group.options.map(option=>localizeRecord(option,locale)||option)
      }
    }))
  }));

  const menuProducts=localizedProducts.map(product=>{
    const scheduled=isMenuScheduleAvailable(product.category,now)&&isMenuScheduleAvailable(product,now);
    const available=scheduled&&restaurantProductAvailable(product,now);
    const effectivePrice=effectiveRestaurantPrice(product);
    return {
      id:product.id,name:product.name,description:product.description,imageUrl:product.imageUrl,
      priceCents:effectivePrice,originalPriceCents:effectivePrice<product.priceCents?product.priceCents:null,
      stockQty:product.stockQty,trackStock:product.trackStock,category:product.category.name,
      categoryId:product.category.id,categoryDescription:product.category.description,
      categoryImageUrl:product.category.imageUrl,badge:product.badge,tags:product.tags,
      allergens:product.allergens,prepMinutes:product.prepMinutes,featured:product.featured,
      soldOut:product.soldOut,available,scheduled,maxPerOrder:product.maxPerOrder,allowNotes:product.allowNotes,
      groups:product.modifierLinks.filter(link=>link.group.active).map(link=>({
        id:link.group.id,name:link.group.name,required:link.group.required,
        minSelect:link.group.minSelect,maxSelect:link.group.maxSelect,
        options:link.group.options.map(option=>({id:option.id,name:option.name,priceCents:option.priceCents}))
      }))
    };
  }).filter(product=>product.scheduled&&(product.available||settings?.showSoldOut!==false));

  const sections=visual.sections;
  const hero=sections.find(section=>section.type==="HERO")||sections[0];
  const features=sections.find(section=>section.type==="FEATURES");
  const cta=sections.find(section=>section.type==="CTA");
  const extraSections=sections.filter(section=>section!==hero&&section!==features&&section!==cta);
  const accepting=localizedSettings?.acceptingOrders!==false;
  const hours=(localizedSettings?.openTime||"07:00")+"–"+(localizedSettings?.closeTime||"22:00");

  return <main className="restaurantStandalone">
    <header className="restaurantStandaloneTop">
      <a className="restaurantStandaloneBrand" href="/">
        <span>M</span><div><b>RESTAURANTE MORIAH</b><small>COZINHA • DELIVERY • RETIRADA</small></div>
      </a>
      <nav>
        <a href="#cardapio">Cardápio</a>
        <a href="#diferenciais">Como funciona</a>
        <a href="/corporativo">Corporativo</a>
      </nav>
      <a className="restaurantStandaloneWhatsapp" href="https://wa.me/5511978492432" target="_blank" rel="noreferrer">WhatsApp ↗</a>
    </header>

    <section
      className="restaurantStandaloneHero"
      style={hero?.imageUrl?{backgroundImage:"linear-gradient(90deg,rgba(8,8,8,.88),rgba(8,8,8,.48)),url("+hero.imageUrl+")"}:undefined}
    >
      <div className="restaurantStandaloneHeroCopy">
        <small>{hero?.eyebrow||"RESTAURANTE MORIAH"}</small>
        <h1>{hero?.title||"Comida de verdade. Pedido fácil."}</h1>
        {hero?.subtitle&&<h2>{hero.subtitle}</h2>}
        {hero?.body&&<p>{hero.body}</p>}
        <div className="restaurantStandaloneHeroActions">
          <a href={hero?.ctaHref||"#cardapio"}>{hero?.ctaLabel||"Ver cardápio"}</a>
          {hero?.secondaryCtaHref&&<a className="secondary" href={hero.secondaryCtaHref} target="_blank" rel="noreferrer">{hero.secondaryCtaLabel||"Falar com a Moriah"}</a>}
        </div>
      </div>
      <div className="restaurantStandaloneHeroStatus">
        <div><small>STATUS</small><b>{accepting?"ACEITANDO PEDIDOS":"PEDIDOS PAUSADOS"}</b></div>
        <div><small>ATENDIMENTO</small><b>{hours}</b></div>
        <div><small>ITENS DISPONÍVEIS</small><b>{menuProducts.filter(item=>item.available).length}</b></div>
      </div>
    </section>

    {features&&<section className="restaurantStandaloneFeatures" id="diferenciais">
      <div className="restaurantStandaloneSectionHead">
        <small>{features.eyebrow}</small>
        <h2>{features.title}</h2>
        {features.subtitle&&<p>{features.subtitle}</p>}
      </div>
      <div className="restaurantStandaloneFeatureGrid">
        {splitItems(features.body).map((item,index)=><article key={item.title+index}>
          <span>{String(index+1).padStart(2,"0")}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </article>)}
      </div>
    </section>}

    <section className="restaurantStandaloneMenu" id="cardapio">
      <div className="restaurantStandaloneSectionHead">
        <small>CARDÁPIO ONLINE</small>
        <h2>{localizedSettings?.menuTitle||"Escolha seu pedido."}</h2>
        <p>{localizedSettings?.menuSubtitle||"Produtos, adicionais, preços e disponibilidade ligados diretamente à nossa operação."}</p>
      </div>
      <Menu
        products={menuProducts}
        bookingToken=""
        accepting={accepting}
        locale={locale}
        standalone
        successPath="/pedido-confirmado"
      />
    </section>

    {extraSections.map((section,index)=><SpecialPageSection key={"restaurant-extra-"+index} section={section}/>)}

    {cta&&<section className="restaurantStandaloneCta">
      <div><small>{cta.eyebrow}</small><h2>{cta.title}</h2><p>{cta.subtitle||cta.body}</p></div>
      {cta.ctaHref&&<a href={cta.ctaHref}>{cta.ctaLabel||"Ver cardápio"}</a>}
    </section>}

    <footer className="restaurantStandaloneFooter">
      <b>RESTAURANTE MORIAH</b>
      <span>Mesmo motor de pedidos, estoque e cozinha. Uma experiência pública independente.</span>
      <a href="/corporativo">Moriah Corporativo →</a>
    </footer>
  </main>;
}
