import {notFound} from "next/navigation";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number,currency="BRL")=>(value/100).toLocaleString("pt-BR",{style:"currency",currency});

export default async function ReceiptPage({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;

  const booking=await prisma.bookingLead.findUnique({
    where:{id},
    include:{
      accommodation:true,
      guest:true,
      payments:{where:{status:"PAID"},orderBy:{paidAt:"asc"}},
      companions:true,
      restaurantRoomCharges:{orderBy:{createdAt:"asc"}}
    }
  });
  if(!booking)notFound();

  const paid=booking.payments.reduce((sum,payment)=>sum+payment.amountCents,0);
  const total=booking.quotedTotalCents||0;
  const balance=Math.max(0,total-paid);

  return <main className="receiptPage">
    <header>
      <div>
        <small>POUSADA MORIAH • COMPROVANTE</small>
        <h1>Resumo da hospedagem</h1>
      </div>
      <b>#{booking.id.slice(-8).toUpperCase()}</b>
    </header>

    <section className="receiptGrid">
      <div><small>Hóspede</small><strong>{booking.name}</strong><span>{booking.phone}{booking.email?" • "+booking.email:""}</span></div>
      <div><small>Hospedagem</small><strong>{booking.accommodation?.name||"—"}</strong><span>{booking.guests} hóspede(s)</span></div>
      <div><small>Entrada</small><strong>{booking.checkIn?.toLocaleDateString("pt-BR")||"—"}</strong></div>
      <div><small>Saída</small><strong>{booking.checkOut?.toLocaleDateString("pt-BR")||"—"}</strong></div>
    </section>

    {booking.companions.length>0&&<section className="receiptSection">
      <h2>Acompanhantes</h2>
      {booking.companions.map(companion=><div className="receiptLine" key={companion.id}>
        <span>{companion.name}</span><b>{companion.document||"—"}</b>
      </div>)}
    </section>}

    <section className="receiptSection">
      <h2>Financeiro</h2>
      <div className="receiptLine"><span>Total da hospedagem</span><b>{money(total,booking.quotedCurrency||"BRL")}</b></div>
      {booking.payments.map(payment=><div className="receiptLine" key={payment.id}>
        <span>{payment.method} • {payment.paidAt.toLocaleDateString("pt-BR")}</span>
        <b>{money(payment.amountCents,payment.currency)}</b>
      </div>)}
      <div className="receiptLine receiptTotal"><span>Recebido</span><b>{money(paid)}</b></div>
      <div className="receiptLine receiptTotal"><span>Saldo</span><b>{money(balance)}</b></div>
    </section>

    {booking.restaurantRoomCharges.length>0&&<section className="receiptSection">
      <h2>Consumo Moriah Food</h2>
      {booking.restaurantRoomCharges.map(charge=><div className="receiptLine" key={charge.id}>
        <span>{charge.status} • {charge.createdAt.toLocaleDateString("pt-BR")}</span>
        <b>{money(charge.amountCents)}</b>
      </div>)}
    </section>}

    <footer>
      <p>Documento operacional emitido pelo sistema Moriah.</p>
      <small>Emissão: {new Date().toLocaleString("pt-BR")}</small>
    </footer>
  </main>;
}
