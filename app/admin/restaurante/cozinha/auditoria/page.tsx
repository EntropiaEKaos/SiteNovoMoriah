import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

const labels:Record<string,string>={
  ITEM_STATUS:"Item alterado",
  ITEM_REWORK:"Refação",
  ORDER_AUTO_READY:"Pedido pronto",
  ORDER_PRIORITY:"Prioridade",
  ORDER_PAUSED:"Pedido pausado",
  ORDER_RESUMED:"Pedido retomado",
  EXPEDITION_STATUS:"Conferência",
  EXPEDITION_RELEASED:"Pedido liberado"
};

export default async function Page(){
  await requireAdmin();
  const events=await prisma.restaurantKitchenEvent.findMany({
    include:{order:{select:{guestName:true,roomLabel:true}},item:{select:{nameSnapshot:true}}},
    orderBy:{createdAt:"desc"},
    take:300
  });

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0</small><h1>Auditoria</h1><p>Rastro operacional de quem iniciou, refez, priorizou, pausou, conferiu e liberou pedidos.</p></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/auditoria"/>

    <section className="kitchenAuditTimeline">
      {events.map(event=><article key={event.id}>
        <time>{event.createdAt.toLocaleString("pt-BR")}</time>
        <span className="kitchenAuditDot"/>
        <div>
          <small>#{event.orderId.slice(-6).toUpperCase()} • {event.actorName||"Sistema"}</small>
          <h3>{labels[event.eventType]||event.eventType}</h3>
          <p>{event.order.guestName}{event.order.roomLabel?" • "+event.order.roomLabel:""}{event.item?" • "+event.item.nameSnapshot:""}</p>
          {(event.fromStatus||event.toStatus)&&<b>{event.fromStatus||"—"} → {event.toStatus||"—"}</b>}
          {event.notes&&<em>{event.notes}</em>}
        </div>
      </article>)}
      {events.length===0&&<div className="kitchenEmpty"><strong>Sem eventos ainda.</strong><p>A auditoria começa a ser preenchida quando a Kitchen 4.0 entra em uso.</p></div>}
    </section>
  </main>;
}
