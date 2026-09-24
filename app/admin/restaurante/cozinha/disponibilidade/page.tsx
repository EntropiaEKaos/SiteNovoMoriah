import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {quickProductAvailability} from "../../../../../lib/kitchen-actions";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();
  const products=await prisma.restaurantProduct.findMany({
    include:{category:true,station:true},
    orderBy:[{station:{sortOrder:"asc"}},{category:{sortOrder:"asc"}},{name:"asc"}]
  });
  const now=Date.now();

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0</small><h1>Disponibilidade</h1><p>Pause um item por tempo determinado, marque esgotado ou reative sem entrar no editor completo do cardápio.</p></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/disponibilidade"/>

    <section className="availabilityGrid">
      {products.map(product=>{
        const paused=Boolean(product.pauseUntil&&product.pauseUntil.getTime()>now);
        const state=product.soldOut?"ESGOTADO":paused?"PAUSADO":product.active?"DISPONÍVEL":"INATIVO";
        return <article className={"availabilityCard state-"+state.toLowerCase()} key={product.id}>
          <div>
            <small>{product.station?.name||"SEM ESTAÇÃO"} • {product.category.name}</small>
            <h3>{product.name}</h3>
            <p>{state}{paused&&product.pauseUntil?" até "+product.pauseUntil.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}</p>
          </div>
          <div className="availabilityActions">
            <form action={quickProductAvailability}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mode" value="AVAILABLE"/><button className="ok">Disponível</button></form>
            <form action={quickProductAvailability}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mode" value="PAUSE_30"/><button>30 min</button></form>
            <form action={quickProductAvailability}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mode" value="PAUSE_60"/><button>1 h</button></form>
            <form action={quickProductAvailability}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mode" value="PAUSE_120"/><button>2 h</button></form>
            <form action={quickProductAvailability}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mode" value="SOLD_OUT"/><button className="danger">Esgotado</button></form>
          </div>
        </article>;
      })}
    </section>
  </main>;
}
