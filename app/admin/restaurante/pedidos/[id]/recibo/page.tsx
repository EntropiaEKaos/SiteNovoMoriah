import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{
  style:"currency",
  currency:"BRL"
});

const paymentLabels:Record<string,string>={
  ROOM:"Conta da hospedagem",
  PIX:"PIX",
  CARD:"Cartão",
  CASH:"Dinheiro"
};

export default async function FoodReceipt({
  params
}:{
  params:Promise<{id:string}>
}){
  await requireAdmin();
  const {id}=await params;

  const order=await prisma.restaurantOrder.findUnique({
    where:{id},
    include:{
      booking:{include:{accommodation:true}},
      items:{include:{modifiers:true}},
      roomCharge:true
    }
  });
  if(!order)notFound();

  return <main className="receiptPage foodReceiptPage">
    <header>
      <div>
        <small>MORIAH FOOD • RECIBO</small>
        <h1>Pedido #{order.id.slice(-6).toUpperCase()}</h1>
      </div>
      <b>{order.status}</b>
    </header>

    <section className="receiptGrid">
      <div><small>Cliente</small><strong>{order.guestName}</strong><span>{order.phone||"—"}</span></div>
      <div><small>Local</small><strong>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</strong></div>
      <div><small>Pedido</small><strong>{order.createdAt.toLocaleDateString("pt-BR")}</strong><span>{order.createdAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div><small>Pagamento</small><strong>{paymentLabels[order.paymentMethod]||order.paymentMethod}</strong><span>{order.paymentStatus}</span></div>
    </section>

    <section className="receiptSection">
      <h2>Itens</h2>
      {order.items.map(item=><div className="foodReceiptItem" key={item.id}>
        <div>
          <strong>{item.quantity}× {item.nameSnapshot}</strong>
          {item.modifiers.length>0&&<small>{item.modifiers.map(modifier=>modifier.nameSnapshot+(modifier.priceCents>0?" +"+money(modifier.priceCents):"")).join(" • ")}</small>}
          {item.notes&&<small>Obs.: {item.notes}</small>}
        </div>
        <b>{money(item.totalCents)}</b>
      </div>)}
      <div className="receiptLine receiptTotal"><span>Total do pedido</span><b>{money(order.totalCents)}</b></div>
    </section>

    {order.notes&&<section className="receiptSection">
      <h2>Observações</h2>
      <p>{order.notes}</p>
    </section>}

    {order.roomCharge&&<section className="receiptSection">
      <h2>Conta da hospedagem</h2>
      <div className="receiptLine"><span>Status do lançamento</span><b>{order.roomCharge.status}</b></div>
      <div className="receiptLine"><span>Valor lançado</span><b>{money(order.roomCharge.amountCents)}</b></div>
      {order.roomCharge.settledAt&&<div className="receiptLine"><span>Liquidado em</span><b>{order.roomCharge.settledAt.toLocaleString("pt-BR")}</b></div>}
    </section>}

    <footer>
      <p>Obrigado. Este documento registra o pedido no Moriah Food.</p>
      <small>Emissão: {new Date().toLocaleString("pt-BR")}</small>
    </footer>
  </main>;
}
