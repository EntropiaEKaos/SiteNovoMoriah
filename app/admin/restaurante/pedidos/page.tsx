import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {setRestaurantOrderStatus} from "../../../../lib/restaurant-actions";
import KdsAutoRefresh from "./kds-auto-refresh";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const minutesBetween=(start:Date,end=new Date())=>Math.max(0,Math.floor((end.getTime()-start.getTime())/60000));

const labels:Record<string,string>={
  NEW:"Novos",
  PREPARING:"Preparando",
  READY:"Prontos"
};

const nextAction:Record<string,{status:string;label:string}>={
  NEW:{status:"PREPARING",label:"Iniciar preparo"},
  PREPARING:{status:"READY",label:"Marcar pronto"},
  READY:{status:"DELIVERED",label:"Entregar"}
};

export default async function Page(){
  await requireAdmin();

  const [orders,settings]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{status:{in:["NEW","PREPARING","READY"]}},
      include:{
        booking:{select:{id:true,name:true,accommodation:{select:{name:true,roomNumber:true}}}},
        items:{
          include:{modifiers:true}
        }
      },
      orderBy:{createdAt:"asc"}
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  const target=settings?.prepTargetMinutes||25;
  const now=new Date();
  const delayed=orders.filter(order=>{
    if(order.status==="READY")return false;
    const started=order.preparingAt||order.createdAt;
    return minutesBetween(started,now)>target;
  }).length;

  const columns=["NEW","PREPARING","READY"] as const;

  return <main className="adminPage kdsPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / KDS 3.0</small>
        <h1>Cozinha</h1>
        <p>Fila operacional em tempo real, com SLA de preparo, etapas claras, alertas e comanda imprimível.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante">← Gestão Food</Link>
        <Link className="adminSecondaryAction" href="/admin/restaurante/bi">BI →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Fila ativa</small><strong>{orders.length}</strong></div>
      <div><small>Novos</small><strong>{orders.filter(order=>order.status==="NEW").length}</strong></div>
      <div><small>Em preparo</small><strong>{orders.filter(order=>order.status==="PREPARING").length}</strong></div>
      <div><small>Acima do SLA</small><strong>{delayed}</strong></div>
    </section>

    <KdsAutoRefresh
      orderIds={orders.map(order=>order.id)}
      soundEnabled={settings?.kdsSoundEnabled!==false}
    />

    {orders.length===0?<section className="adminEmptyState">
      <strong>Nenhum pedido na fila.</strong>
      <p>Novos pedidos aparecerão automaticamente aqui.</p>
    </section>:<section className="kdsBoard">
      {columns.map(status=>{
        const columnOrders=orders.filter(order=>order.status===status);

        return <div className={"kdsColumn is-"+status.toLowerCase()} key={status}>
          <header>
            <div>
              <small>ETAPA</small>
              <h2>{labels[status]}</h2>
            </div>
            <strong>{columnOrders.length}</strong>
          </header>

          <div className="kdsColumnBody">
            {columnOrders.length===0?<div className="kdsEmpty">Sem pedidos nesta etapa.</div>:columnOrders.map(order=>{
              const timerStart=order.status==="PREPARING"
                ?order.preparingAt||order.createdAt
                :order.status==="READY"
                  ?order.readyAt||order.preparingAt||order.createdAt
                  :order.createdAt;
              const elapsed=minutesBetween(timerStart,now);
              const late=order.status!=="READY"&&elapsed>target;
              const action=nextAction[order.status];

              return <article className={"kdsTicket"+(late?" isLate":"")} key={order.id}>
                <div className="kdsTicketHead">
                  <div>
                    <small>#{order.id.slice(-6).toUpperCase()} • {order.createdAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>
                    <h3>{order.guestName}</h3>
                    <p>{order.roomLabel
                      ||order.booking?.accommodation?.roomNumber
                      ||order.booking?.accommodation?.name
                      ||"Retirada / recepção"}</p>
                  </div>
                  <div className="kdsTimer">
                    <strong>{elapsed}</strong>
                    <small>MIN</small>
                  </div>
                </div>

                {late&&<div className="kdsAlert">ACIMA DA META DE {target} MIN</div>}

                <div className="kdsItems">
                  {order.items.map(item=><div className="kdsItem" key={item.id}>
                    <div>
                      <b>{item.quantity}× {item.nameSnapshot}</b>
                      {item.modifiers.length>0&&<small>
                        {item.modifiers.map(modifier=>modifier.nameSnapshot).join(" • ")}
                      </small>}
                    </div>
                    <span>{money(item.totalCents)}</span>
                  </div>)}
                </div>

                {order.notes&&<div className="kdsNotes"><b>OBS.</b> {order.notes}</div>}

                <div className="kdsTicketFooter">
                  <div>
                    <small>TOTAL</small>
                    <strong>{money(order.totalCents)}</strong>
                  </div>
                  <div className="adminInlineActions">
                    <Link href={"/admin/restaurante/pedidos/"+order.id+"/comanda"} target="_blank">Imprimir ↗</Link>
                    {action&&<form action={setRestaurantOrderStatus}>
                      <input type="hidden" name="id" value={order.id}/>
                      <input type="hidden" name="status" value={action.status}/>
                      <button className="highlight">{action.label}</button>
                    </form>}
                    <form action={setRestaurantOrderStatus}>
                      <input type="hidden" name="id" value={order.id}/>
                      <input type="hidden" name="status" value="CANCELLED"/>
                      <button className="danger">Cancelar</button>
                    </form>
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
