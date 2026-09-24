import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function KitchenTicket({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;

  const order=await prisma.restaurantOrder.findUnique({
    where:{id},
    include:{
      booking:{include:{accommodation:true}},
      items:{include:{modifiers:true}}
    }
  });
  if(!order)notFound();

  return <main className="kitchenPrint">
    <header>
      <small>MORIAH FOOD / COMANDA</small>
      <h1>Pedido #{order.id.slice(-6).toUpperCase()}</h1>
      <p>{order.createdAt.toLocaleString("pt-BR")}</p>
    </header>

    <section>
      <div className="receiptLine"><span>Cliente</span><b>{order.guestName}</b></div>
      <div className="receiptLine"><span>Local</span><b>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</b></div>
      <div className="receiptLine"><span>Pagamento</span><b>{order.paymentMethod}</b></div>
      <div className="receiptLine"><span>Status</span><b>{order.status}</b></div>
    </section>

    <section className="kitchenPrintItems">
      {order.items.map(item=><div key={item.id}>
        <strong>{item.quantity}× {item.nameSnapshot}</strong>
        {item.modifiers.length>0&&<small>{item.modifiers.map(modifier=>modifier.nameSnapshot).join(" • ")}</small>}
        <b>{money(item.totalCents)}</b>
      </div>)}
    </section>

    {order.notes&&<section className="kitchenPrintNotes">
      <small>OBSERVAÇÕES</small>
      <strong>{order.notes}</strong>
    </section>}

    <footer>
      <span>Total</span>
      <strong>{money(order.totalCents)}</strong>
    </footer>
  </main>;
}
