import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {
  pmsBookingAction,
  registerPayment,
  setBookingStatus,
  settleRestaurantFolio
} from "../../actions";
import {
  addBookingCompanion,
  deleteBookingCompanion,
  updateBookingProfile
} from "../detail-actions";
import CheckInForm from "../../pms/check-in-form";

export const dynamic="force-dynamic";

const money=(value:number,currency="BRL")=>(value/100).toLocaleString("pt-BR",{style:"currency",currency});

const auditLabels:Record<string,string>={
  CHECK_IN:"Check-in realizado",
  CHECK_OUT:"Check-out realizado",
  NO_SHOW:"Marcado como no-show",
  PAYMENT:"Pagamento registrado",
  RESTAURANT_FOLIO_SETTLED:"Consumo do restaurante liquidado",
  DATES_CHANGED_FROM_CALENDAR:"Datas alteradas pelo mapa",
  BOOKING_PROFILE_UPDATED:"Dados da reserva atualizados",
  COMPANION_ADDED:"Acompanhante adicionado",
  COMPANION_REMOVED:"Acompanhante removido"
};

export default async function BookingDetail({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;

  const booking=await prisma.bookingLead.findUnique({
    where:{id},
    include:{
      accommodation:true,
      guest:true,
      payments:{orderBy:{paidAt:"desc"}},
      charges:{orderBy:{createdAt:"asc"}},
      auditLogs:{orderBy:{createdAt:"desc"},take:100},
      companions:{orderBy:{createdAt:"asc"}},
      housekeepingTasks:{orderBy:{createdAt:"desc"}},
      restaurantRoomCharges:{
        include:{order:true},
        orderBy:{createdAt:"desc"}
      }
    }
  });
  if(!booking)notFound();

  const paid=booking.payments
    .filter(payment=>payment.status==="PAID"&&payment.reference!=="RESTAURANT_FOLIO")
    .reduce((sum,payment)=>sum+payment.amountCents,0);
  const lodgingTotal=booking.quotedTotalCents||0;
  const extrasTotal=booking.charges.reduce((sum,charge)=>sum+charge.amountCents,0);
  const total=lodgingTotal+extrasTotal;
  const balance=Math.max(0,total-paid);
  const restaurantOpen=booking.restaurantRoomCharges
    .filter(charge=>["OPEN","SETTLING"].includes(charge.status))
    .reduce((sum,charge)=>sum+charge.amountCents,0);
  const statusEditable=["NEW","CONTACTED","CONFIRMED","CANCELLED"].includes(booking.status);

  return <main className="adminPage bookingDetailPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / RESERVA</small>
        <h1>{booking.name}</h1>
        <p>{booking.accommodation?.name||"Hospedagem"} • {booking.status} • {booking.source}</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/reservas">← Reservas</Link>
        <Link className="adminSecondaryAction" href={"/admin/reservas/"+booking.id+"/recibo"} target="_blank">Resumo / imprimir ↗</Link>
        {booking.checkedInAt&&<Link className="adminSecondaryAction" href={"/admin/reservas/"+booking.id+"/checkin-recibo"} target="_blank">Recibo check-in ↗</Link>}
        {booking.guest&&<Link className="adminSecondaryAction" href={"/admin/hospedes/"+booking.guest.id}>Ficha do hóspede →</Link>}
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Total</small><strong style={{fontSize:20}}>{money(total,booking.quotedCurrency||"BRL")}</strong></div>
      <div><small>Recebido</small><strong style={{fontSize:20}}>{money(paid)}</strong></div>
      <div><small>Saldo</small><strong style={{fontSize:20}}>{money(balance)}</strong></div>
      <div><small>Restaurante aberto</small><strong style={{fontSize:20}}>{money(restaurantOpen)}</strong></div>
    </section>

    <section className="adminTwoCol">
      <div className="adminStack">
        <article className="adminSectionCard">
          <div className="adminListCardHead">
            <div>
              <small>DADOS DA RESERVA</small>
              <h2>Hospedagem</h2>
            </div>
            <span className={"adminChip "+(["CONFIRMED","CHECKED_IN","CHECKED_OUT"].includes(booking.status)?"ok":"warn")}>{booking.status}</span>
          </div>

          <div className="adminStatusLine"><span>Hospedagem</span><b>{booking.accommodation?.name||"—"}</b></div>
          <div className="adminStatusLine"><span>Entrada</span><b>{booking.checkIn?.toLocaleDateString("pt-BR")||"—"}</b></div>
          <div className="adminStatusLine"><span>Saída</span><b>{booking.checkOut?.toLocaleDateString("pt-BR")||"—"}</b></div>
          <div className="adminStatusLine"><span>Hóspedes declarados</span><b>{booking.guests}</b></div>
          <div className="adminStatusLine"><span>Tarifa</span><b>{booking.quotedRatePlan||"—"}</b></div>
          <div className="adminStatusLine"><span>Origem</span><b>{booking.source}</b></div>

          <div className="adminInlineActions" style={{marginTop:18}}>

            {booking.status==="CHECKED_IN"&&<form action={pmsBookingAction}>
              <input type="hidden" name="id" value={booking.id}/>
              <input type="hidden" name="action" value="CHECK_OUT"/>
              <button className="highlight">Fazer check-out</button>
            </form>}
            {booking.status==="CONFIRMED"&&<form action={pmsBookingAction}>
              <input type="hidden" name="id" value={booking.id}/>
              <input type="hidden" name="action" value="NO_SHOW"/>
              <button>No-show</button>
            </form>}
          </div>

          {statusEditable&&<form action={setBookingStatus} className="adminFormGrid" style={{marginTop:16}}>
            <input type="hidden" name="id" value={booking.id}/>
            <label>Status comercial
              <select name="status" defaultValue={booking.status}>
                <option value="NEW">Nova</option>
                <option value="CONTACTED">Contatada</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </label>
            <button>Atualizar status</button>
          </form>}
        </article>

        <article className="adminSectionCard">
          <h2>Titular e observações</h2>
          <form action={updateBookingProfile} className="adminFormGrid">
            <input type="hidden" name="id" value={booking.id}/>
            <label className="span2">Nome
              <input name="name" required defaultValue={booking.name}/>
            </label>
            <label>Telefone
              <input name="phone" required defaultValue={booking.phone}/>
            </label>
            <label>E-mail
              <input name="email" type="email" defaultValue={booking.email||""}/>
            </label>
            <label>Quantidade de hóspedes
              <input name="guests" type="number" min="1" max="50" defaultValue={booking.guests}/>
            </label>
            <label className="span2">Pedido / observação do hóspede
              <textarea name="message" rows={4} defaultValue={booking.message||""}/>
            </label>
            <label className="span2">Observações internas
              <textarea name="internalNotes" rows={5} defaultValue={booking.internalNotes||""} placeholder="Visível somente para a equipe."/>
            </label>
            <button className="span2">Salvar reserva</button>
          </form>
        </article>

        <article className="adminSectionCard">
          <h2>Acompanhantes</h2>
          <p>{booking.companions.length} acompanhante(s) identificado(s).</p>

          {booking.companions.length>0&&<div className="adminStack" style={{marginBottom:20}}>
            {booking.companions.map(companion=><div className="adminStatusLine" key={companion.id}>
              <span>
                <b>{companion.name}</b><br/>
                <small>{companion.document||"Sem documento"}{companion.birthDate?" • "+companion.birthDate.toLocaleDateString("pt-BR"):""}</small>
              </span>
              <form action={deleteBookingCompanion}>
                <input type="hidden" name="id" value={companion.id}/>
                <button>Remover</button>
              </form>
            </div>)}
          </div>}

          <form action={addBookingCompanion} className="adminFormGrid">
            <input type="hidden" name="bookingId" value={booking.id}/>
            <label className="span2">Nome completo
              <input name="name" required/>
            </label>
            <label>Documento
              <input name="document"/>
            </label>
            <label>Nascimento
              <input name="birthDate" type="date"/>
            </label>
            <label className="span2">Observação
              <input name="notes"/>
            </label>
            <button className="span2">Adicionar acompanhante</button>
          </form>
        </article>

        <article className="adminSectionCard">
          <h2>Financeiro</h2>
          <div className="adminStatusLine"><span>Hospedagem</span><b>{money(lodgingTotal,booking.quotedCurrency||"BRL")}</b></div>
          <div className="adminStatusLine"><span>Adicionais</span><b>{money(extrasTotal)}</b></div>
          <div className="adminStatusLine"><span>Total da conta</span><b>{money(total,booking.quotedCurrency||"BRL")}</b></div>
          <div className="adminStatusLine"><span>Recebido</span><b>{money(paid)}</b></div>
          <div className="adminStatusLine"><span>Saldo</span><b>{money(balance)}</b></div>

          {booking.status==="CONFIRMED"?<CheckInForm
            bookingId={booking.id}
            lodgingTotalCents={lodgingTotal}
            alreadyPaidCents={paid}
          />:<form action={registerPayment} className="adminFormGrid" style={{marginTop:18}}>
            <input type="hidden" name="bookingId" value={booking.id}/>
            <label>Valor
              <input name="amount" inputMode="decimal" required placeholder="R$"/>
            </label>
            <label>Forma
              <select name="method" defaultValue="PIX">
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro</option>
                <option value="TRANSFER">Transferência</option>
                <option value="EXTERNAL">Pagamento externo</option>
              </select>
            </label>
            <button className="span2">Registrar pagamento</button>
          </form>}

          {booking.charges.length>0&&<div className="adminStack" style={{marginTop:18}}>
            <small>ADICIONAIS DA RESERVA</small>
            {booking.charges.map(charge=><div className="adminStatusLine" key={charge.id}>
              <span>{charge.description}<br/><small>{charge.category} • {charge.createdAt.toLocaleString("pt-BR")}</small></span>
              <b>{money(charge.amountCents)}</b>
            </div>)}
          </div>}

          {booking.payments.filter(payment=>payment.reference!=="RESTAURANT_FOLIO").length>0&&<div className="adminStack" style={{marginTop:18}}>
            {booking.payments.filter(payment=>payment.reference!=="RESTAURANT_FOLIO").map(payment=><div className="adminStatusLine" key={payment.id}>
              <span>{payment.method} • {payment.source} • {payment.paidAt.toLocaleString("pt-BR")}{payment.reference?" • "+payment.reference:""}</span>
              <b>{money(payment.amountCents,payment.currency)}</b>
            </div>)}
          </div>}
        </article>

        <article className="adminSectionCard">
          <h2>Consumo do restaurante</h2>
          {booking.restaurantRoomCharges.length===0?<div className="adminPageNote">Nenhum consumo lançado na conta desta hospedagem.</div>:<>
            <div className="adminStack">
              {booking.restaurantRoomCharges.map(charge=><div className="adminStatusLine" key={charge.id}>
                <span>Pedido #{charge.order.id.slice(-6)} • {charge.status}</span>
                <b>{money(charge.amountCents)}</b>
              </div>)}
            </div>
            {restaurantOpen>0&&<form action={settleRestaurantFolio} style={{marginTop:16}}>
              <input type="hidden" name="bookingId" value={booking.id}/>
              <input type="hidden" name="method" value="ROOM_SETTLEMENT"/>
              <button>Liquidar consumo do restaurante</button>
            </form>}
          </>}
        </article>
      </div>

      <aside className="adminStack">
        <article className="adminSectionCard isDark">
          <small>TIMELINE / AUDITORIA</small>
          <h2>Histórico</h2>
          <p>Eventos operacionais registrados pelo sistema.</p>
          {booking.auditLogs.length===0?<div className="adminPageNote">Nenhum evento registrado.</div>:booking.auditLogs.map(log=><div className="adminStatusLine" key={log.id} style={{display:"block"}}>
            <span><b>{auditLabels[log.action]||log.action}</b></span><br/>
            <small>{log.createdAt.toLocaleString("pt-BR")}</small>
          </div>)}
        </article>

        <article className="adminSectionCard">
          <h2>Governança</h2>
          {booking.housekeepingTasks.length===0?<div className="adminPageNote">Nenhuma tarefa vinculada.</div>:booking.housekeepingTasks.map(task=><div className="adminStatusLine" key={task.id}>
            <span>{task.type} • {task.scheduledFor.toLocaleString("pt-BR")}</span>
            <b>{task.status}</b>
          </div>)}
        </article>

        <article className="adminSectionCard">
          <h2>CRM</h2>
          {booking.guest?<><p>Esta reserva está ligada à ficha de <b>{booking.guest.name}</b>.</p>
            <Link className="adminPrimaryAction" href={"/admin/hospedes/"+booking.guest.id}>Abrir CRM</Link>
          </>:<div className="adminPageNote">Ainda não há ficha de hóspede vinculada. O check-in cria ou conecta automaticamente o cadastro.</div>}
        </article>
      </aside>
    </section>
  </main>;
}
