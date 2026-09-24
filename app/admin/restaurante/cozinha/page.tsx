import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import KitchenNav from "./kitchen-nav";

export const dynamic="force-dynamic";

const minutes=(start:Date,end=new Date())=>Math.max(0,Math.floor((end.getTime()-start.getTime())/60000));

export default async function Page(){
  await requireAdmin();

  const [orders,stations,settings,pendingNotifications]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{status:{in:["NEW","PREPARING","READY"]}},
      include:{items:{include:{station:true}}},
      orderBy:[{priority:"desc"},{createdAt:"asc"}]
    }),
    prisma.restaurantStation.findMany({
      where:{active:true},
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.notificationMessage.count({where:{audience:"KITCHEN",channel:"IN_APP",status:"READY"}})
  ]);

  const now=new Date();
  const warning=settings?.kitchenWarningMinutes||20;
  const critical=settings?.kitchenCriticalMinutes||35;
  const ready=orders.filter(order=>order.status==="READY").length;
  const urgent=orders.filter(order=>order.priority==="URGENT").length;
  const late=orders.filter(order=>order.status!=="READY"&&minutes(order.preparingAt||order.createdAt,now)>=warning).length;

  const stationCards=stations.map(station=>{
    const items=orders.flatMap(order=>order.items).filter(item=>item.stationId===station.id);
    const pending=items.filter(item=>item.kitchenStatus!=="READY").reduce((sum,item)=>sum+item.quantity,0);
    const preparing=items.filter(item=>item.kitchenStatus==="PREPARING").reduce((sum,item)=>sum+item.quantity,0);
    const readyItems=items.filter(item=>item.kitchenStatus==="READY").reduce((sum,item)=>sum+item.quantity,0);
    const pressure=pending>=12?"CRÍTICA":pending>=7?"ALTA":pending>=3?"MÉDIA":"NORMAL";
    return {...station,pending,preparing,readyItems,pressure};
  });

  const nextOrders=orders.slice(0,8);

  return <main className="adminPage kitchen40">
    <section className="kitchenHero">
      <div>
        <small>MORIAH KITCHEN 4.1 • COMMAND CENTER</small>
        <h1>Central da cozinha</h1>
        <p>Uma visão única da operação: carga das estações, urgências, atrasos, expedição e próximos pedidos.</p>
      </div>
      <div className="kitchenHeroBadge"><b>{orders.length}</b><span>pedidos ativos</span></div>
    </section>

    <KitchenNav active="/admin/restaurante/cozinha"/>

    <section className="kitchenMetricGrid">
      <article><small>Fila total</small><strong>{orders.length}</strong><span>{pendingNotifications} entrada(s) nova(s)</span></article>
      <article className={urgent?"isWarn":""}><small>Urgentes</small><strong>{urgent}</strong><span>prioridade operacional</span></article>
      <article className={late?"isWarn":""}><small>Acima do SLA</small><strong>{late}</strong><span>alerta a partir de {warning} min</span></article>
      <article><small>Expedição</small><strong>{ready}</strong><span>pedidos prontos</span></article>
    </section>

    <section className="kitchenCommandGrid">
      <article className="kitchenPanel kitchenCommandStations">
        <div className="kitchenPanelHead">
          <div><small>CARGA AGORA</small><h2>Estações</h2></div>
          <Link href="/admin/restaurante/cozinha/estacoes">Configurar →</Link>
        </div>

        <div className="kitchenCommandStationList">
          {stationCards.map(station=><Link
            href={"/admin/restaurante/cozinha/estacao/"+station.id}
            key={station.id}
            className={"pressure-"+station.pressure.toLowerCase().replace("í","i")}
          >
            <i style={{background:station.color}}/>
            <div><b>{station.name}</b><small>Meta {station.targetMinutes} min</small></div>
            <strong>{station.pending}</strong>
            <span>{station.pressure}</span>
          </Link>)}
          {stationCards.length===0&&<div className="kitchenEmpty"><strong>Sem estações.</strong><p>Crie as estações padrão para começar.</p></div>}
        </div>
      </article>

      <article className="kitchenPanel kitchenCommandFlow">
        <div className="kitchenPanelHead">
          <div><small>PRÓXIMOS PEDIDOS</small><h2>Fluxo ativo</h2></div>
          <Link href="/admin/restaurante/pedidos">Abrir KDS →</Link>
        </div>
        <div className="kitchenCommandOrders">
          {nextOrders.map(order=>{
            const elapsed=minutes(order.preparingAt||order.createdAt,now);
            const severity=elapsed>=critical?"critical":elapsed>=warning?"warning":"normal";
            return <Link href="/admin/restaurante/pedidos" key={order.id} className={"is-"+severity}>
              <div><small>#{order.id.slice(-6).toUpperCase()} • {order.status}</small><b>{order.guestName}</b></div>
              <span>{order.items.reduce((sum,item)=>sum+item.quantity,0)} un.</span>
              <strong>{elapsed} min</strong>
            </Link>;
          })}
          {nextOrders.length===0&&<div className="kitchenEmpty"><strong>Fila limpa.</strong><p>Nenhum pedido ativo.</p></div>}
        </div>
      </article>
    </section>

    <section className="kitchenCommandActions">
      <Link href="/admin/restaurante/pedidos"><b>KDS completo</b><span>Produção por pedido e item →</span></Link>
      <Link href="/admin/restaurante/cozinha/expedicao"><b>Expedição</b><span>Conferência e liberação →</span></Link>
      <Link href="/admin/restaurante/cozinha/producao"><b>Produção</b><span>Mise en place e lotes →</span></Link>
      <Link href="/admin/restaurante/cozinha/disponibilidade"><b>Disponibilidade</b><span>Pausas e esgotados →</span></Link>
    </section>
  </main>;
}
