import {prisma} from "../../lib/prisma";
import {
  effectiveRestaurantPrice,
  isMenuScheduleAvailable,
  restaurantProductAvailable
} from "../../lib/restaurant-menu";
import PublicSubNav from "../public-sub-nav";
import Menu from "./menu";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{booking?:string}>}){
  const q=await searchParams;

  const [products,settings]=await Promise.all([
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
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  const now=new Date();

  const menuProducts=products
    .map(product=>{
      const categoryAvailable=isMenuScheduleAvailable(product.category,now);
      const available=categoryAvailable&&restaurantProductAvailable(product,now);
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
        maxPerOrder:product.maxPerOrder,
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
    .filter(product=>product.available||settings?.showSoldOut!==false);

  const accepting=settings?.acceptingOrders!==false;
  const hours=(settings?.openTime||"07:00")+"–"+(settings?.closeTime||"22:00");
  const title=settings?.menuTitle||"Moriah Food";
  const subtitle=settings?.menuSubtitle||"Cardápio da casa conectado à sua hospedagem.";

  return <main className="publicSubpage foodPublicV2">
    <PublicSubNav/>

    <section
      className={"publicHero foodMenuHero"+(settings?.menuBannerUrl?" hasImage":"")}
      style={settings?.menuBannerUrl?{
        backgroundImage:
          "linear-gradient(90deg,rgba(10,10,10,.88),rgba(10,10,10,.45)),url("+settings.menuBannerUrl+")"
      }:undefined}
    >
      <small>MORIAH FOOD • PRAIA GRANDE</small>
      <h1>{title}<span style={{color:"#ffd400"}}>.</span></h1>
      <p>{subtitle}</p>
      <div className="publicHeroMeta">
        <span>{accepting?"PEDIDOS ABERTOS":"PEDIDOS PAUSADOS"}</span>
        <span>ATENDIMENTO {hours}</span>
        <span>{menuProducts.filter(product=>product.available).length} ITEM(NS) DISPONÍVEIS</span>
        {q.booking&&<span>HOSPEDAGEM IDENTIFICADA</span>}
      </div>
    </section>

    <section className="foodShell">
      <Menu
        products={menuProducts}
        bookingToken={q.booking||""}
        accepting={accepting}
      />
    </section>
  </main>;
}
