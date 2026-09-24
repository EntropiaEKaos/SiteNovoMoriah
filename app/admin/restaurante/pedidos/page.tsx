import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {setRestaurantOrderStatus} from "../../../../lib/restaurant-actions";
import {
  setKitchenItemStatus,
  setKitchenOrderPriority,
  toggleKitchenOrderPause
} from "../../../../lib/kitchen-actions";
import KdsAutoRefresh from "./kds-auto-refresh";
import KitchenNav from "../cozinha/kitchen-nav";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const minutes=(start:Date,end=new Date())=>Math.max(0,Math.floor((end.getTime()-start.getTime())/60000));

const labels:Record<string,string>={
  NEW:"Novos",
  PREPARING:"Em produção",
  READY:"Prontos"
};

const paymentLabels:Record<string,string>={
  ROOM:"Quarto",
  PIX:"PIX",
  CARD:"Cartão",
  CASH:"Dinheiro"
};

const itemLabels:Record<string,string>={
  PENDING:"Pendente",
  PREPARING:"Preparando",
  READY:"Pronto"
};

export default async function Page({
  searchParams
}:{
  searchParams:Promise<{station?:string}>
}){
  const session=await requireAdmin();
  const params=await searchParams;
  const selectedStation=String(params.station||"");

  const [orders,settings,pendingNotifications,stations]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{status:{in:["NEW","PREPARING","READY"]}},
      include:{
        booking:{select:{id:true,name:true,accommodation:{select:{name:true,roomNumber:true}}}},
        items:{
          include:{modifiers:true,station:true},
          orderBy:[{stationId:"asc"},{id:"asc"}]
        }
      },
      orderBy:[{priority:"desc"},{createdAt:"asc"}]
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.notificationMessage.count({
      where:{audience:"KITCHEN",channel:"IN_APP",status:"READY"}
    }),
    prisma.restaurantStation.findMany({
      where:{active:true},
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    })
  ]);

  const now=new Date();
  const warning=settings?.kitchenWarningMinutes||20;
  const critical=settings?.kitchenCriticalMinutes||35;
  const visibleOrders=selectedStation
    ?orders.filter(order=>order.items.some(item=>item.stationId===selectedStation))
    :orders;
  const columns=["NEW","PREPARING","READY"] as const;

  const stationLoad=stations.map(station=>({
    ...station,
    pending:orders.reduce((sum,order)=>sum+order.items.filter(item=>
      item.stationId===station.id&&item.kitchenStatus!=="READY"
    ).reduce((value,item)=>value+item.quantity,0),0)
  }));

  const delayed=visibleOrders.filter(order=>{
    if(order.status==="READY")return false;
    return minutes(order.preparingAt||order.createdAt,now)>=warning;
  }).length;

  return <main className="adminPage kdsPage kitchen40">
    <section className="kitchenHero">
      <div>
        <small>MORIAH KITCHEN 4.0 • OPERADOR {session.username}</small>
        <h1>KDS de produção</h1>
        <p>Pedidos por item e estação, prioridade, SLA, refação, pausa operacional e expedição conectados em uma única fila.</p>
      </div>
      <div className="kitchenHeroBadge">
        <b>{visibleOrders.length}</b>
        <span>pedidos ativos</span>
      </div>
    </section>

    <KitchenNav active="/admin/restaurante/pedidos"/>

    <section className="kitchenMetricGrid">
      <article><small>Fila ativa</small><strong>{visibleOrders.length}</strong><span>pedidos em operação</span></article>
      <article><small>Itens pendentes</small><strong>{visibleOrders.reduce((sum,o)=>sum+o.items.filter(i=>i.kitchenStatus!=="READY").length,0)}</strong><span>linhas ainda em produção</span></article>
      <article className={delayed?"isWarn":""}><small>Acima do alerta</small><strong>{delayed}</strong><span>meta {warning} min</span></article>
      <article><small>Prontos p/ expedição</small><strong>{visibleOrders.filter(o=>o.status==="READY").length}</strong><span>aguardando liberação</span></article>
    </section>

    <KdsAutoRefresh
      orderIds={orders.map(order=>order.id)}
      soundEnabled={settings?.kdsSoundEnabled!==false}
      pendingNotifications={pendingNotifications}
    />

    <section className="kitchenStationBar">
      <Link className={!selectedStation?"isActive":""} href="/admin/restaurante/pedidos">
        <b>Todas</b><span>{orders.reduce((s,o)=>s+o.items.filter(i=>i.kitchenStatus!=="READY").length,0)} itens</span>
      </Link>
      {stationLoad.map(station=><Link
        key={station.id}
        className={selectedStation===station.id?"isActive":""}
        href={"/admin/restaurante/pedidos?station="+station.id}
        style={{borderColor:selectedStation===station.id?station.color:undefined}}
      >
        <b>{station.name}</b><span>{station.pending} un. em carga</span>
      </Link>)}
    </section>

    {pendingNotifications>0&&<section className="kdsNotificationBanner">
      <div>
        <small>ENTRADAS NOVAS</small>
        <strong>{pendingNotifications} pedido(s) aguardando início.</strong>
      </div>
      <span>Ao iniciar o primeiro item, o aviso do pedido é reconhecido.</span>
    </section>}

    {visibleOrders.length===0?<section className="kitchenEmpty">
      <strong>Fila limpa.</strong>
      <p>Nenhum pedido ativo nesta visão.</p>
    </section>:<section className="kdsBoard kitchenBoard40">
      {columns.map(status=>{
        const columnOrders=visibleOrders.filter(order=>order.status===status);
        return <div className={"kdsColumn is-"+status.toLowerCase()} key={status}>
          <header>
            <div><small>FLUXO</small><h2>{labels[status]}</h2></div>
            <strong>{columnOrders.length}</strong>
          </header>

          <div className="kdsColumnBody">
            {columnOrders.length===0?<div className="kdsEmpty">Sem pedidos nesta etapa.</div>:columnOrders.map(order=>{
              const elapsed=minutes(order.preparingAt||order.createdAt,now);
              const severity=elapsed>=critical?"critical":elapsed>=warning?"warning":"normal";
              const items=selectedStation
                ?order.items.filter(item=>item.stationId===selectedStation)
                :order.items;

              return <article className={
                "kdsTicket kitchenTicket40 is-"+severity+
                (order.priority==="URGENT"?" isUrgent":"")+
                (order.pausedAt?" isPaused":"")
              } key={order.id}>
                <div className="kdsTicketHead">
                  <div>
                    <div className="kdsTicketMeta">
                      <span>#{order.id.slice(-6).toUpperCase()}</span>
                      <span>{order.createdAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
                      <span>{paymentLabels[order.paymentMethod]||order.paymentMethod}</span>
                      <span>{order.source.replaceAll("_"," ")}</span>
                    </div>
                    <h3>{order.guestName}</h3>
                    <p>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</p>
                  </div>
                  <div className={"kdsTimer is-"+severity}>
                    <strong>{elapsed}</strong><small>MIN</small>
                  </div>
                </div>

                {order.priority==="URGENT"&&<div className="kitchenUrgent">URGENTE • PRIORIDADE DE PRODUÇÃO</div>}
                {order.pausedAt&&<div className="kitchenPaused">PAUSADO • {order.pauseReason||"Pausa operacional"}</div>}
                {severity!=="normal"&&order.status!=="READY"&&<div className={"kdsAlert "+severity}>
                  {severity==="critical"?"CRÍTICO":"ATENÇÃO"} • {elapsed} MIN EM FILA
                </div>}

                <div className="kitchenOrderTools">
                  <form action={setKitchenOrderPriority}>
                    <input type="hidden" name="orderId" value={order.id}/>
                    <input type="hidden" name="priority" value={order.priority==="URGENT"?"NORMAL":"URGENT"}/>
                    <button>{order.priority==="URGENT"?"Retirar urgência":"Marcar urgente"}</button>
                  </form>
                  <form action={toggleKitchenOrderPause}>
                    <input type="hidden" name="orderId" value={order.id}/>
                    {!order.pausedAt&&<input name="reason" placeholder="Motivo da pausa"/>}
                    <button>{order.pausedAt?"Retomar":"Pausar"}</button>
                  </form>
                </div>

                <div className="kdsItems kitchenItems40">
                  {items.map(item=><div className={"kdsItem kitchenItem40 status-"+item.kitchenStatus.toLowerCase()} key={item.id}>
                    <div className="kitchenItemMain">
                      <div className="kitchenItemTitle">
                        <b>{item.quantity}× {item.nameSnapshot}</b>
                        <span>{itemLabels[item.kitchenStatus]||item.kitchenStatus}</span>
                      </div>
                      <div className="kitchenItemMeta">
                        <span>{item.station?.name||"Sem estação"}</span>
                        {item.modifiers.length>0&&<span>{item.modifiers.map(m=>m.nameSnapshot).join(" • ")}</span>}
                      </div>
                      {item.kitchenInstructionsSnapshot&&<p className="kitchenInstruction">{item.kitchenInstructionsSnapshot}</p>}
                      {item.notes&&<p className="kitchenItemNote">OBS. {item.notes}</p>}
                    </div>

                    <div className="kitchenItemActions">
                      {item.kitchenStatus==="PENDING"&&<form action={setKitchenItemStatus}>
                        <input type="hidden" name="itemId" value={item.id}/>
                        <input type="hidden" name="status" value="PREPARING"/>
                        <button className="start">Iniciar</button>
                      </form>}
                      {item.kitchenStatus==="PREPARING"&&<>
                        <form action={setKitchenItemStatus}>
                          <input type="hidden" name="itemId" value={item.id}/>
                          <input type="hidden" name="status" value="READY"/>
                          <button className="ready">Pronto</button>
                        </form>
                        <form action={setKitchenItemStatus}>
                          <input type="hidden" name="itemId" value={item.id}/>
                          <input type="hidden" name="status" value="PENDING"/>
                          <button>Voltar</button>
                        </form>
                      </>}
                      {item.kitchenStatus==="READY"&&<form action={setKitchenItemStatus}>
                        <input type="hidden" name="itemId" value={item.id}/>
                        <input type="hidden" name="status" value="PREPARING"/>
                        <input type="hidden" name="note" value="Refação solicitada pela cozinha"/>
                        <button className="rework">Refazer</button>
                      </form>}
                    </div>
                  </div>)}
                </div>

                {order.notes&&<div className="kdsNotes"><b>OBS. GERAL</b> {order.notes}</div>}

                <div className="kdsTicketFooter">
                  <div className="kdsTicketTotal">
                    <small>TOTAL • {order.items.reduce((sum,item)=>sum+item.quantity,0)} UN.</small>
                    <strong>{money(order.totalCents)}</strong>
                  </div>
                  <div className="kdsTicketActions">
                    {order.status==="READY"?<Link className="kitchenExpedite" href="/admin/restaurante/cozinha/expedicao">Ir para expedição →</Link>:null}
                    <div className="kdsSecondaryActions">
                      <Link href={"/admin/restaurante/pedidos/"+order.id+"/cozinha"+(selectedStation?"?station="+selectedStation:"")} target="_blank">Produção ↗</Link>
                      <Link href={"/admin/restaurante/pedidos/"+order.id+"/comanda"} target="_blank">Comanda ↗</Link>
                      <form action={setRestaurantOrderStatus} className="kitchenCancelForm">
                        <input type="hidden" name="id" value={order.id}/>
                        <input type="hidden" name="status" value="CANCELLED"/>
                        {order.status!=="NEW"&&<input name="cancelReason" required placeholder="Motivo do cancelamento"/>}
                        <button className="danger">Cancelar</button>
                      </form>
                    </div>
                  </div>
                </div>
              </article>;
            })}
          </div>
        </div>;
      })}
    </section>}
  </main>;
}
