import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {setRestaurantOrderStatus} from "../../../../lib/restaurant-actions";
import KdsAutoRefresh from "./kds-auto-refresh";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const labels:Record<string,string>={
  NEW:"Novos",
  PREPARING:"Preparando",
  READY:"Prontos"
};

function ageMinutes(date:Date){
  return Math.max(0,Math.floor((Date.now()-date.getTime())/60000));
}

function nextStatus(status:string){
  if(status==="NEW")return "PREPARING";
  if(status==="PREPARING")return "READY";
  if(status==="READY")return "DELIVERED";
  return null;
}

function nextLabel(status:string){
  if(status==="NEW")return "Iniciar preparo";
  if(status==="PREPARING")return "Marcar pronto";
  if(status==="READY")return "Entregar";
  return "";
}

export default async function Page(){
  await requireAdmin();

  const [orders,settings]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{status:{in:["NEW","PREPARING","READY"]}},
      include:{
        items:{include:{modifiers:true}},
        booking:{select:{id:true,name:true,accommodation:{select:{name:true,roomNumber:true}}}}
      },
      orderBy:{createdAt:"asc"}
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  const target=settings?.prepTargetMinutes||25;
  const columns=["NEW","PREPARING","READY"] as const;
  const late=orders.filter(order=>{
    const anchor=order.status==="PREPARING"
      ?order.preparingAt||order.createdAt
      :order.status==="READY"
        ?order.readyAt||order.createdAt
        :order.createdAt;
    return ageMinutes(anchor)>target;
  }).length;

  return <main className="adminPage kdsPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / KDS 3.0</small>
        <h1>Cozinha</h1>
        <p>Fluxo ao vivo de pedidos, tempo de preparo, alertas e impressão de comandas.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante">Gestão do Food →</Link>
        <Link className="adminSecondaryAction" href="/restaurante" target="_blank">Cardápio ↗</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Na fila</small><strong>{orders.length}</strong></div>
      <div><small>Novos</small><strong>{orders.filter(order=>order.status==="NEW").length}</strong></div>
      <div><small>Em preparo</small><strong>{orders.filter(order=>order.status==="PREPARING").length}</strong></div>
      <div><small>Acima da meta</small><strong>{late}</strong></div>
    </section>

    <KdsAutoRefresh
      orderIds={orders.map(order=>order.id)}
      soundEnabled={settings?.kdsSoundEnabled!==false}
    />

    <div className="kdsBoard">
      {columns.map(status=>{
        const rows=orders.filter(order=>order.status===status);

        return <section className="kdsColumn" key={status}>
          <header>
            <div>
              <small>{status}</small>
              <h2>{labels[status]}</h2>
            </div>
            <b>{rows.length}</b>
          </header>

          <div className="kdsColumnBody">
            {rows.length===0?<div className="kdsEmpty">Nenhum pedido nesta etapa.</div>:rows.map(order=>{
              const anchor=order.status==="PREPARING"
                ?order.preparingAt||order.createdAt
                :order.status==="READY"
                  ?order.readyAt||order.createdAt
                  :order.createdAt;
              const minutes=ageMinutes(anchor);
              const isLate=minutes>target;
              const next=nextStatus(order.status);

              return <article className={"kdsTicket"+(isLate?" isLate":"")} key={order.id}>
                <div className="kdsTicketHead">
                  <div>
                    <small>#{order.id.slice(-6).toUpperCase()}</small>
                    <h3>{order.guestName}</h3>
                    <p>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</p>
                  </div>
                  <div className="kdsTimer">
                    <b>{minutes}</b><small>min</small>
                  </div>
                </div>

                <div className="kdsSla">
                  <span style={{width:Math.min(100,Math.round(minutes*100/target))+"%"}}/>
                </div>
                <small className={isLate?"kdsLateLabel":""}>
                  Meta: {target} min {isLate?"• ATRASADO":""}
                </small>

                <div className="kdsItems">
                  {order.items.map(item=><div key={item.id}>
                    <div>
                      <b>{item.quantity}× {item.nameSnapshot}</b>
                      <span>{money(item.totalCents)}</span>
                    </div>
                    {item.modifiers.length>0&&<small>
                      {item.modifiers.map(modifier=>modifier.nameSnapshot).join(" • ")}
                    </small>}
                  </div>)}
                </div>

                {order.notes&&<div className="kdsNote"><b>OBS.</b> {order.notes}</div>}

                <div className="kdsTicketFooter">
                  <strong>{money(order.totalCents)}</strong>
                  <span>{order.paymentMethod}</span>
                </div>

                <div className="adminInlineActions">
                  {next&&<form action={setRestaurantOrderStatus}>
                    <input type="hidden" name="id" value={order.id}/>
                    <input type="hidden" name="status" value={next}/>
                    <button className="highlight">{nextLabel(order.status)}</button>
                  </form>}
                  <Link href={"/admin/restaurante/pedidos/"+order.id+"/imprimir"} target="_blank">Imprimir ↗</Link>
                  <form action={setRestaurantOrderStatus}>
                    <input type="hidden" name="id" value={order.id}/>
                    <input type="hidden" name="status" value="CANCELLED"/>
                    <button>Cancelar</button>
                  </form>
                </div>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
  </main>;
}
