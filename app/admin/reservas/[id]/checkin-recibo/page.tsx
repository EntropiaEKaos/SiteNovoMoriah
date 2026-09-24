import {notFound} from "next/navigation";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(value:number,currency="BRL")=>(value/100).toLocaleString("pt-BR",{
  style:"currency",
  currency
});

function numberValue(value:unknown,fallback=0){
  return typeof value==="number"&&Number.isFinite(value)?Math.round(value):fallback;
}

export default async function CheckInReceipt({
  params
}:{
  params:Promise<{id:string}>
}){
  await requireAdmin();
  const {id}=await params;

  const booking=await prisma.bookingLead.findUnique({
    where:{id},
    include:{
      accommodation:true,
      guest:true,
      charges:{orderBy:{createdAt:"asc"}},
      payments:{where:{status:"PAID"},orderBy:{paidAt:"asc"}},
      auditLogs:{
        where:{action:"CHECK_IN"},
        orderBy:{createdAt:"desc"},
        take:1
      }
    }
  });
  if(!booking||!booking.checkedInAt)notFound();

  const audit=booking.auditLogs[0];
  const details=audit?.details&&typeof audit.details==="object"&&!Array.isArray(audit.details)
    ?audit.details as Record<string,unknown>
    :{};

  const lodgingCents=numberValue(details.lodgingCents,booking.quotedTotalCents||0);
  const extrasSnapshot=Array.isArray(details.extras)
    ?details.extras.flatMap(item=>{
        if(!item||typeof item!=="object"||Array.isArray(item))return [];
        const record=item as Record<string,unknown>;
        const description=typeof record.description==="string"?record.description:"Adicional";
        const amountCents=numberValue(record.amountCents);
        return amountCents>0?[{description,amountCents}]:[];
      })
    :booking.charges.map(charge=>({
        description:charge.description,
        amountCents:charge.amountCents
      }));

  const extrasTotal=numberValue(
    details.extrasTotalCents,
    extrasSnapshot.reduce((sum,item)=>sum+item.amountCents,0)
  );
  const accountTotal=numberValue(details.accountTotalCents,lodgingCents+extrasTotal);
  const paidBefore=numberValue(details.paidBeforeCents);
  const checkInPayment=numberValue(details.checkInPaymentCents);
  const balance=Math.max(0,accountTotal-paidBefore-checkInPayment);
  const method=typeof details.paymentMethod==="string"?details.paymentMethod:"—";
  const source=typeof details.paymentSource==="string"?details.paymentSource:"CHECK_IN";

  return <main className="receiptPage">
    <header>
      <div>
        <small>POUSADA MORIAH • RECIBO DE CHECK-IN</small>
        <h1>Entrada registrada</h1>
      </div>
      <b>#{booking.id.slice(-8).toUpperCase()}</b>
    </header>

    <section className="receiptGrid">
      <div><small>Hóspede</small><strong>{booking.name}</strong><span>{booking.phone}</span></div>
      <div><small>Hospedagem</small><strong>{booking.accommodation?.name||"—"}</strong><span>{booking.accommodation?.roomNumber?"Unidade "+booking.accommodation.roomNumber:""}</span></div>
      <div><small>Check-in</small><strong>{booking.checkedInAt.toLocaleDateString("pt-BR")}</strong><span>{booking.checkedInAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div><small>Saída prevista</small><strong>{booking.checkOut?.toLocaleDateString("pt-BR")||"—"}</strong></div>
    </section>

    <section className="receiptSection">
      <h2>Composição da entrada</h2>
      <div className="receiptLine"><span>Hospedagem</span><b>{money(lodgingCents,booking.quotedCurrency||"BRL")}</b></div>
      {extrasSnapshot.map((item,index)=><div className="receiptLine" key={index}>
        <span>{item.description}</span><b>{money(item.amountCents)}</b>
      </div>)}
      <div className="receiptLine receiptTotal"><span>Total da conta no check-in</span><b>{money(accountTotal)}</b></div>
    </section>

    <section className="receiptSection">
      <h2>Pagamento da entrada</h2>
      {paidBefore>0&&<div className="receiptLine"><span>Valor já pago antes do check-in</span><b>{money(paidBefore)}</b></div>}
      <div className="receiptLine"><span>{method} • {source}</span><b>{money(checkInPayment)}</b></div>
      <div className="receiptLine receiptTotal"><span>Total pago até a entrada</span><b>{money(paidBefore+checkInPayment)}</b></div>
      <div className="receiptLine receiptTotal"><span>Saldo após check-in</span><b>{money(balance)}</b></div>
    </section>

    <section className="receiptSection receiptSignature">
      <div><span>Responsável pelo atendimento</span><b>________________________________</b></div>
      <div><span>Hóspede / responsável</span><b>________________________________</b></div>
    </section>

    <footer>
      <p>Recibo operacional do check-in emitido pelo sistema Moriah.</p>
      <small>Registro: {(audit?.createdAt||booking.checkedInAt).toLocaleString("pt-BR")} • Emissão: {new Date().toLocaleString("pt-BR")}</small>
    </footer>
  </main>;
}
