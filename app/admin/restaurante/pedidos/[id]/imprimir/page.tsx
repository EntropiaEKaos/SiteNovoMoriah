import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function KitchenPrint({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;

  const order=await prisma.restaurantOrder.findUnique({
    where:{id},
    include:{
      items:{include:{modifiers:true}},
      booking:{include:{accommodation:true}}
    }
  });
  if(!order)notFound();

  return <main className="kitchenPrint">
    <header>
      <small>MORIAH FOOD • COMANDA</small>
      <h1>#{order.id.slice(-6).toUpperCase()}</h1>
      <b>{order.status}</b>
    </header>

    <section>
      <div className="kitchenPrintLine"><span>Cliente</span><b>{order.guestName}</b></div>
      <div className="kitchenPrintLine"><span>Quarto / local</span><b>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</b></div>
      <div className="kitchenPrintLine"><span>Horário</span><b>{order.createdAt.toLocaleString("pt-BR")}</b></div>
      <div className="kitchenPrintLine"><span>Pagamento</span><b>{order.paymentMethod}</b></div>
    </section>

    <section className="kitchenPrintItems">
      {order.items.map(item=><div key={item.id}>
        <div className="kitchenPrintItemHead">
          <b>{item.quantity}× {item.nameSnapshot}</b>
          <strong>{money(item.totalCents)}</strong>
        </div>
        {item.modifiers.length>0&&<p>
          + {item.modifiers.map(modifier=>modifier.nameSnapshot).join(" / ")}
        </p>}
      </div>)}
    </section>

    {order.notes&&<section className="kitchenPrintNote">
      <b>OBSERVAÇÃO</b>
      <p>{order.notes}</p>
    </section>}

    <footer>
      <strong>TOTAL {money(order.totalCents)}</strong>
      <small>Emitido {new Date().toLocaleString("pt-BR")}</small>
    </footer>
  </main>;
}
