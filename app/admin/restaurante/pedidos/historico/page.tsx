import Link from "next/link";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{
  style:"currency",
  currency:"BRL"
});

export default async function FoodOrderHistory({
  searchParams
}:{
  searchParams:Promise<{status?:string;q?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const status=String(params.status||"").trim();
  const q=String(params.q||"").trim();

  const orders=await prisma.restaurantOrder.findMany({
    where:{
      ...(status?{status}:{}),
      ...(q?{
        OR:[
          {guestName:{contains:q,mode:"insensitive"}},
          {roomLabel:{contains:q,mode:"insensitive"}},
          {phone:{contains:q,mode:"insensitive"}}
        ]
      }:{})
    },
    include:{
      booking:{include:{accommodation:true}},
      _count:{select:{items:true}}
    },
    orderBy:{createdAt:"desc"},
    take:200
  });

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / HISTÓRICO</small>
        <h1>Pedidos</h1>
        <p>Consulte pedidos entregues, cancelados e em andamento e reimprima recibos ou comandas.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante/pedidos">← KDS</Link>
        <Link className="adminSecondaryAction" href="/admin/restaurante">Gestão Food →</Link>
      </div>
    </section>

    <section className="adminSectionCard" style={{marginBottom:18}}>
      <form method="get" className="adminFormGrid cols3">
        <label>Busca
          <input name="q" defaultValue={q} placeholder="Cliente, quarto ou telefone"/>
        </label>
        <label>Status
          <select name="status" defaultValue={status}>
            <option value="">Todos</option>
            <option value="NEW">Novo</option>
            <option value="PREPARING">Preparando</option>
            <option value="READY">Pronto</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        <button>Filtrar</button>
      </form>
    </section>

    {orders.length===0?<section className="adminEmptyState">
      <strong>Nenhum pedido encontrado.</strong>
      <p>Ajuste os filtros ou aguarde novos pedidos.</p>
    </section>:<section className="adminStack">
      {orders.map(order=><article className="adminListCard" key={order.id}>
        <div className="adminListCardHead">
          <div>
            <small>#{order.id.slice(-6).toUpperCase()} • {order.createdAt.toLocaleString("pt-BR")}</small>
            <h3>{order.guestName}</h3>
            <p>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"} • {order._count.items} item(ns)</p>
          </div>
          <div style={{textAlign:"right"}}>
            <span className={"adminChip "+(order.status==="DELIVERED"?"ok":order.status==="CANCELLED"?"bad":"warn")}>{order.status}</span>
            <strong style={{display:"block",marginTop:8}}>{money(order.totalCents)}</strong>
          </div>
        </div>

        <div className="adminMetaRow">
          <span className="adminChip">{order.paymentMethod}</span>
          <span className="adminChip">{order.paymentStatus}</span>
          <span className={"adminChip "+(order.priority==="URGENT"?"bad":"")}>{order.priority}</span>
          <span className="adminChip">{order.source.replaceAll("_"," ")}</span>
          <span className="adminChip">Expedição {order.expeditionStatus}</span>
          {order.preparingAt&&<span className="adminChip">Preparo {order.preparingAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          {order.readyAt&&<span className="adminChip">Pronto {order.readyAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          {order.deliveredAt&&<span className="adminChip ok">Entregue {order.deliveredAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>

        <div className="adminInlineActions">
          <Link className="highlight" href={"/admin/restaurante/pedidos/"+order.id+"/recibo"} target="_blank">Recibo ↗</Link>
          <Link href={"/admin/restaurante/pedidos/"+order.id+"/comanda"} target="_blank">Comanda ↗</Link>
          <Link href={"/admin/restaurante/pedidos/"+order.id+"/cozinha"} target="_blank">Produção ↗</Link>
        </div>
      </article>)}
    </section>}
  </main>;
}
