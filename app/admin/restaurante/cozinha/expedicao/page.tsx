import Link from "next/link";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {releaseKitchenOrder,setExpeditionCheck} from "../../../../../lib/kitchen-actions";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

const minutes=(start:Date)=>Math.max(0,Math.floor((Date.now()-start.getTime())/60000));

export default async function Page(){
  await requireAdmin();
  const orders=await prisma.restaurantOrder.findMany({
    where:{status:{in:["PREPARING","READY"]}},
    include:{
      booking:{include:{accommodation:true}},
      items:{include:{station:true,modifiers:true}}
    },
    orderBy:[{priority:"desc"},{createdAt:"asc"}]
  });

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0</small><h1>Expedição</h1><p>Conferência final: veja exatamente o que está pronto, o que falta e libere o pedido somente quando estiver completo.</p></div>
      <div className="kitchenHeroBadge"><b>{orders.filter(o=>o.status==="READY").length}</b><span>prontos</span></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/expedicao"/>

    <section className="expeditionGrid">
      {orders.map(order=>{
        const ready=order.items.filter(item=>item.kitchenStatus==="READY");
        const complete=ready.length===order.items.length&&order.items.length>0;
        return <article className={"expeditionCard"+(complete?" isComplete":"")} key={order.id}>
          <header>
            <div>
              <small>#{order.id.slice(-6).toUpperCase()} • {minutes(order.createdAt)} MIN</small>
              <h2>{order.guestName}</h2>
              <p>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</p>
            </div>
            <strong>{ready.length}/{order.items.length}</strong>
          </header>

          <div className="expeditionProgress"><i style={{width:(order.items.length?ready.length/order.items.length*100:0)+"%"}}/></div>

          <div className="expeditionItems">
            {order.items.map(item=><div className={item.kitchenStatus==="READY"?"isReady":""} key={item.id}>
              <span>{item.kitchenStatus==="READY"?"✓":"○"}</span>
              <div><b>{item.quantity}× {item.nameSnapshot}</b><small>{item.station?.name||"Sem estação"}{item.modifiers.length?" • "+item.modifiers.map(m=>m.nameSnapshot).join(", "):""}</small></div>
            </div>)}
          </div>

          {order.notes&&<div className="kdsNotes"><b>OBS.</b> {order.notes}</div>}

          <footer>
            <form action={setExpeditionCheck}>
              <input type="hidden" name="orderId" value={order.id}/>
              <input type="hidden" name="status" value={order.expeditionStatus==="CHECKING"?"WAITING":"CHECKING"}/>
              <button>{order.expeditionStatus==="CHECKING"?"Desmarcar conferência":"Conferir pedido"}</button>
            </form>
            <Link href={"/admin/restaurante/pedidos/"+order.id+"/etiqueta"} target="_blank">Etiqueta ↗</Link>
            <form action={releaseKitchenOrder}>
              <input type="hidden" name="orderId" value={order.id}/>
              <button className="kitchenPrimary" disabled={!complete}>Liberar / entregar</button>
            </form>
          </footer>
        </article>;
      })}
      {orders.length===0&&<div className="kitchenEmpty"><strong>Nada aguardando expedição.</strong><p>Os pedidos aparecem aqui assim que a produção começa.</p></div>}
    </section>
  </main>;
}
