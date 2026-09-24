import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{id:string}>}){
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

  return <main className="kitchenLabelPrint">
    <header><b>MORIAH FOOD</b><span>#{order.id.slice(-6).toUpperCase()}</span></header>
    <h1>{order.guestName}</h1>
    <h2>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"RETIRADA / RECEPÇÃO"}</h2>
    <section>
      {order.items.map(item=><div key={item.id}>
        <b>{item.quantity}× {item.nameSnapshot}</b>
        {item.modifiers.length>0&&<small>{item.modifiers.map(m=>m.nameSnapshot).join(" • ")}</small>}
      </div>)}
    </section>
    {order.notes&&<p>OBS.: {order.notes}</p>}
    <footer><span>{order.paymentMethod}</span><b>{order.createdAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</b></footer>
  </main>;
}
