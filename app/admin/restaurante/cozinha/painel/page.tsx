import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

const minutes=(a:Date,b:Date)=>Math.max(0,Math.round((b.getTime()-a.getTime())/60000));
const money=(v:number)=>(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function Page(){
  await requireAdmin();
  const since=new Date(Date.now()-7*86400000);
  const [orders,stations,waste]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{createdAt:{gte:since}},
      include:{items:{include:{station:true}}},
      orderBy:{createdAt:"desc"}
    }),
    prisma.restaurantStation.findMany({where:{active:true},orderBy:{sortOrder:"asc"}}),
    prisma.restaurantIngredientMovement.findMany({
      where:{createdAt:{gte:since},type:"WASTE"},
      include:{ingredient:true}
    })
  ]);

  const completed=orders.filter(o=>o.deliveredAt);
  const prepTimes=completed.map(o=>minutes(o.preparingAt||o.createdAt,o.readyAt||o.deliveredAt!));
  const avg=prepTimes.length?Math.round(prepTimes.reduce((a,b)=>a+b,0)/prepTimes.length):0;
  const cancelled=orders.filter(o=>o.status==="CANCELLED").length;
  const revenue=orders.filter(o=>o.status!=="CANCELLED").reduce((s,o)=>s+o.totalCents,0);
  const itemMap=new Map<string,{name:string;qty:number;minutes:number[]}>();
  for(const order of orders)for(const item of order.items){
    const x=itemMap.get(item.productId)||{name:item.nameSnapshot,qty:0,minutes:[]};
    x.qty+=item.quantity;
    if(item.startedAt&&item.readyAt)x.minutes.push(minutes(item.startedAt,item.readyAt));
    itemMap.set(item.productId,x);
  }
  const products=[...itemMap.values()].sort((a,b)=>b.qty-a.qty).slice(0,8);

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0 • ÚLTIMOS 7 DIAS</small><h1>Painel gerencial</h1><p>Tempo, atraso, volume, cancelamento, desperdício e carga por estação para decisões operacionais.</p></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/painel"/>

    <section className="kitchenMetricGrid manager">
      <article><small>Tempo médio</small><strong>{avg} min</strong><span>produção até pronto</span></article>
      <article><small>Pedidos</small><strong>{orders.length}</strong><span>{completed.length} concluídos</span></article>
      <article><small>Cancelamentos</small><strong>{cancelled}</strong><span>{orders.length?Math.round(cancelled/orders.length*100):0}% da fila</span></article>
      <article><small>Receita Food</small><strong>{money(revenue)}</strong><span>não cancelados</span></article>
    </section>

    <section className="kitchenTwoCol managerPanels">
      <article className="kitchenPanel">
        <div className="kitchenPanelHead"><div><small>CARGA ATUAL</small><h2>Estações</h2></div></div>
        <div className="stationLoadList">
          {stations.map(station=>{
            const active=orders.filter(o=>["NEW","PREPARING"].includes(o.status)).flatMap(o=>o.items).filter(i=>i.stationId===station.id&&i.kitchenStatus!=="READY").reduce((s,i)=>s+i.quantity,0);
            return <div key={station.id}><span style={{background:station.color}}/><b>{station.name}</b><strong>{active}</strong><small>{active>=10?"ALTA":active>=5?"MÉDIA":"NORMAL"}</small></div>;
          })}
        </div>
      </article>

      <article className="kitchenPanel">
        <div className="kitchenPanelHead"><div><small>DESPERDÍCIO</small><h2>Perdas registradas</h2></div><strong>{waste.length}</strong></div>
        <div className="wasteList">{waste.slice(0,12).map(w=><div key={w.id}><b>{w.ingredient.name}</b><span>{Math.abs(w.quantity)} {w.ingredient.unit}</span><small>{w.reason||"Sem motivo"}</small></div>)}</div>
      </article>
    </section>

    <section className="kitchenPanel">
      <div className="kitchenPanelHead"><div><small>PRODUTIVIDADE</small><h2>Itens mais produzidos</h2></div></div>
      <div className="managerProductTable">
        {products.map((p,i)=><div key={p.name}><b>#{i+1} {p.name}</b><span>{p.qty} un.</span><span>{p.minutes.length?Math.round(p.minutes.reduce((a,b)=>a+b,0)/p.minutes.length)+" min":"sem leitura"}</span></div>)}
      </div>
    </section>
  </main>;
}
