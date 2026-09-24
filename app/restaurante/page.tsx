import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import {
  effectiveRestaurantPrice,
  isMenuScheduleAvailable,
  restaurantProductAvailable
} from "../../lib/restaurant-menu";
import PublicSiteChrome from "../public-site-chrome";
import Menu from "./menu";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{booking?:string}>}){
  const q=await searchParams;

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
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const now=new Date();

  const menuProducts=products
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

  const accepting=settings?.acceptingOrders!==false;
  const hours=(settings?.openTime||"07:00")+"–"+(settings?.closeTime||"22:00");
  const title=settings?.menuTitle||"Moriah Food";
  const subtitle=settings?.menuSubtitle||"Cardápio da casa conectado à sua hospedagem.";

  return <PublicSiteChrome settings={siteSettings} navPages={navPages}>
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
        <span><b>{accepting?"ABERTO":"PAUSADO"}</b><small>PEDIDOS</small></span>
        <span><b>{hours}</b><small>ATENDIMENTO</small></span>
        <span><b>{menuProducts.filter(product=>product.available).length}</b><small>ITENS DISPONÍVEIS</small></span>
      </div>
    </section>

    {q.booking&&<div className="foodBookingIdentifiedV6">Hospedagem identificada • pedidos podem ser vinculados à sua conta.</div>}

    <section className="foodShell foodShellV6">
      <Menu products={menuProducts} bookingToken={q.booking||""} accepting={accepting}/>
    </section>
  </PublicSiteChrome>;
}
