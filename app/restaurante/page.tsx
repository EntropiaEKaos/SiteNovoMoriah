import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import {
  effectiveRestaurantPrice,
  isMenuScheduleAvailable,
  restaurantProductAvailable
} from "../../lib/restaurant-menu";
import PublicSiteChrome from "../public-site-chrome";
import Menu from "./menu";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{booking?:string}>}){
  const q=await searchParams;
  const locale=await getSiteLocale();

  const [products,settings,siteSettings,navPages]=await Promise.all([
    prisma.restaurantProduct.findMany({
      where:{active:true,category:{active:true}},
      include:{
        category:true,
        modifierLinks:{
          include:{
            group:{
              include:{options:{where:{active:true},orderBy:{name:"asc"}}}
            }
          }
        },
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
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const now=new Date();
  const localizedSettings=localizeRecord(settings,locale);
  const localizedSiteSettings=localizeRecord(siteSettings,locale);
  const localizedNavPages=navPages.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const localizedProducts=products.map(product=>{
    const localizedProduct=localizeRecord(product,locale)||product;
    const localizedCategory=localizeRecord(product.category,locale)||product.category;
    const localizedLinks=product.modifierLinks.map(link=>({
      ...link,
      group:{
        ...(localizeRecord(link.group,locale)||link.group),
        options:link.group.options.map(option=>localizeRecord(option,locale)||option)
      }
    }));
    return {...localizedProduct,category:localizedCategory,modifierLinks:localizedLinks};
  });

  const menuProducts=localizedProducts
    .map(product=>{
      const categoryScheduled=isMenuScheduleAvailable(product.category,now);
      const productScheduled=isMenuScheduleAvailable(product,now);
      const scheduled=categoryScheduled&&productScheduled;
      const available=scheduled&&restaurantProductAvailable(product,now);
      const effectivePrice=effectiveRestaurantPrice(product);

      return {
        id:product.id,
        name:product.name,
        description:product.description,
        imageUrl:product.imageUrl,
        priceCents:effectivePrice,
        originalPriceCents:effectivePrice<product.priceCents?product.priceCents:null,
        stockQty:product.stockQty,
        trackStock:product.trackStock,
        category:product.category.name,
        categoryId:product.category.id,
        categoryDescription:product.category.description,
        categoryImageUrl:product.category.imageUrl,
        badge:product.badge,
        tags:product.tags,
        allergens:product.allergens,
        prepMinutes:product.prepMinutes,
        featured:product.featured,
        soldOut:product.soldOut,
        available,
        scheduled,
        maxPerOrder:product.maxPerOrder,
        allowNotes:product.allowNotes,
        groups:product.modifierLinks
          .filter(link=>link.group.active)
          .map(link=>({
            id:link.group.id,
            name:link.group.name,
            required:link.group.required,
            minSelect:link.group.minSelect,
            maxSelect:link.group.maxSelect,
            options:link.group.options.map(option=>({
              id:option.id,
              name:option.name,
              priceCents:option.priceCents
            }))
          }))
      };
    })
    .filter(product=>product.scheduled&&(product.available||settings?.showSoldOut!==false));

  const accepting=localizedSettings?.acceptingOrders!==false;
  const hours=(localizedSettings?.openTime||"07:00")+"–"+(localizedSettings?.closeTime||"22:00");
  const title=localizedSettings?.menuTitle||"Moriah Food";
  const subtitle=localizedSettings?.menuSubtitle||(locale==="en"?"Our menu connected to your stay.":locale==="es"?"Nuestro menú conectado a tu hospedaje.":"Cardápio da casa conectado à sua hospedagem.");
  const t=locale==="en"?{open:"OPEN",paused:"PAUSED",orders:"ORDERS",service:"SERVICE",items:"AVAILABLE ITEMS",linked:"Stay identified • orders can be linked to your room account."}:locale==="es"?{open:"ABIERTO",paused:"PAUSADO",orders:"PEDIDOS",service:"ATENCIÓN",items:"ÍTEMS DISPONIBLES",linked:"Hospedaje identificado • los pedidos pueden vincularse a tu cuenta."}:{open:"ABERTO",paused:"PAUSADO",orders:"PEDIDOS",service:"ATENDIMENTO",items:"ITENS DISPONÍVEIS",linked:"Hospedagem identificada • pedidos podem ser vinculados à sua conta."};

  return <PublicSiteChrome settings={localizedSiteSettings} navPages={localizedNavPages} locale={locale}>
    <section
      className={"siteSubpageHeroV6 foodHeroV6"+(settings?.menuBannerUrl?" hasImage":"")}
      style={settings?.menuBannerUrl?{
        backgroundImage:
          "linear-gradient(90deg,rgba(4,35,46,.92),rgba(4,35,46,.42)),url("+settings.menuBannerUrl+")"
      }:undefined}
    >
      <div>
        <small>MORIAH FOOD • PRAIA GRANDE</small>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="siteSubpageHeroStats">
        <span><b>{accepting?t.open:t.paused}</b><small>{t.orders}</small></span>
        <span><b>{hours}</b><small>{t.service}</small></span>
        <span><b>{menuProducts.filter(product=>product.available).length}</b><small>{t.items}</small></span>
      </div>
    </section>

    {q.booking&&<div className="foodBookingIdentifiedV6">{t.linked}</div>}

    <section className="foodShell foodShellV6">
      <Menu products={menuProducts} bookingToken={q.booking||""} accepting={accepting} locale={locale}/>
    </section>
  </PublicSiteChrome>;
}
