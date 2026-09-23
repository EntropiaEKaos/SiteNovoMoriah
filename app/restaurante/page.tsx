import {prisma} from "../../lib/prisma";
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
        modifierLinks:{include:{group:{include:{options:{where:{active:true}}}}}},
        recipes:{include:{ingredient:true}}
      },
      orderBy:[{category:{sortOrder:"asc"}},{name:"asc"}]
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  const available=products
    .filter(p=>(!p.trackStock||p.stockQty>0)&&p.recipes.every(r=>r.ingredient.stockQty>=r.quantity))
    .map(p=>({
      id:p.id,
      name:p.name,
      description:p.description,
      priceCents:p.priceCents,
      stockQty:p.stockQty,
      trackStock:p.trackStock,
      category:p.category.name,
      groups:p.modifierLinks
        .filter(x=>x.group.active)
        .map(x=>({
          id:x.group.id,
          name:x.group.name,
          required:x.group.required,
          minSelect:x.group.minSelect,
          maxSelect:x.group.maxSelect,
          options:x.group.options.map(o=>({id:o.id,name:o.name,priceCents:o.priceCents}))
        }))
    }));

  const accepting=settings?.acceptingOrders!==false;
  const hours=(settings?.openTime||"07:00")+"–"+(settings?.closeTime||"22:00");

  return <main className="publicSubpage">
    <PublicSubNav/>
    <section className="publicHero">
      <small>MORIAH FOOD • PRAIA GRANDE</small>
      <h1>Seu pedido,<br/>direto da cozinha<span style={{color:"#ffd400"}}>.</span></h1>
      <p>Cardápio da casa conectado à sua hospedagem. Escolha os itens, personalize adicionais e envie o pedido sem sair da Moriah.</p>
      <div className="publicHeroMeta">
        <span>{accepting?"PEDIDOS ABERTOS":"PEDIDOS PAUSADOS"}</span>
        <span>ATENDIMENTO {hours}</span>
        {q.booking&&<span>HOSPEDAGEM IDENTIFICADA</span>}
      </div>
    </section>
    <section className="foodShell">
      <Menu products={available} bookingToken={q.booking||""} accepting={accepting}/>
    </section>
  </main>;
}
