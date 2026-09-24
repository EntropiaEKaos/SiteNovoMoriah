import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

export default async function Page({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{station?:string}>;
}){
  await requireAdmin();
  const {id}=await params;
  const query=await searchParams;
  const order=await prisma.restaurantOrder.findUnique({
    where:{id},
    include:{
      booking:{include:{accommodation:true}},
      items:{include:{station:true,modifiers:true}}
    }
  });
  if(!order)notFound();

  const items=query.station
    ?order.items.filter(item=>item.stationId===query.station)
    :order.items;
  const station=items[0]?.station?.name||"PRODUÇÃO";

  return <main className="kitchenPrint kitchenPrint40">
    <header>
      <small>MORIAH KITCHEN 4.0 • {station.toUpperCase()}</small>
      <h1>#{order.id.slice(-6).toUpperCase()}</h1>
      <p>{order.createdAt.toLocaleString("pt-BR")} • {order.guestName}</p>
      <b>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"RETIRADA / RECEPÇÃO"}</b>
    </header>

    <section className="kitchenPrintItems">
      {items.map(item=><div key={item.id}>
        <strong>{item.quantity}× {item.nameSnapshot}</strong>
        <b>{item.kitchenStatus}</b>
        {item.modifiers.length>0&&<small>ADICIONAIS: {item.modifiers.map(m=>m.nameSnapshot).join(" • ")}</small>}
        {item.kitchenInstructionsSnapshot&&<p><b>PREPARO:</b> {item.kitchenInstructionsSnapshot}</p>}
        {item.notes&&<p className="kitchenPrintNotes"><b>OBS.:</b> {item.notes}</p>}
      </div>)}
    </section>

    {order.notes&&<section className="kitchenPrintNotes"><b>OBSERVAÇÃO GERAL</b><p>{order.notes}</p></section>}

    <footer>
      <span>{items.reduce((s,i)=>s+i.quantity,0)} unidade(s)</span>
      <b>{station}</b>
    </footer>
  </main>;
}
