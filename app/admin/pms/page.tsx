import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {
  pmsBookingAction,
  registerPayment,
  updateHousekeeping,
  settleRestaurantFolio
} from "../actions";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function PMS(){
  await requireAdmin();

  const now=new Date();
  const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const tomorrow=new Date(todayStart.getTime()+86400000);
  const horizon=new Date(todayStart.getTime()+14*86400000);

  const [bookings,tasks,arrivalsToday,departuresToday]=await Promise.all([
    prisma.bookingLead.findMany({
      where:{
        OR:[
          {checkIn:{gte:todayStart,lt:horizon}},
          {status:{in:["CHECKED_IN","CONFIRMED"]}}
        ]
      },
      include:{
        accommodation:true,
        guest:true,
        payments:true,
        restaurantRoomCharges:{where:{status:{in:["OPEN","SETTLING"]}}}
      },
      orderBy:{checkIn:"asc"},
      take:120
    }),
    prisma.housekeepingTask.findMany({
      where:{status:{not:"DONE"}},
      include:{accommodation:true},
      orderBy:{scheduledFor:"asc"},
      take:80
    }),
    prisma.bookingLead.count({
      where:{status:"CONFIRMED",checkIn:{gte:todayStart,lt:tomorrow}}
    }),
    prisma.bookingLead.count({
      where:{status:"CHECKED_IN",checkOut:{gte:todayStart,lt:tomorrow}}
    })
  ]);

  const inHouse=bookings.filter(booking=>booking.status==="CHECKED_IN").length;
  const openBalance=bookings.reduce((sum,booking)=>{
    const paid=booking.payments
      .filter(payment=>payment.status==="PAID")
      .reduce((value,payment)=>value+payment.amountCents,0);
    return sum+Math.max(0,(booking.quotedTotalCents||0)-paid);
  },0);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / OPERAÇÃO</small>
        <h1>Front Desk</h1>
        <p>Check-in, check-out, pagamentos, consumo do restaurante e governança conectados à ficha do hóspede e ao mapa de inventário.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/canais/calendario">Mapa de Reservas →</Link>
        <Link className="adminSecondaryAction" href="/admin/hospedes">Hóspedes →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Na casa</small><strong>{inHouse}</strong></div>
      <div><small>Entradas hoje</small><strong>{arrivalsToday}</strong></div>
      <div><small>Saídas hoje</small><strong>{departuresToday}</strong></div>
      <div><small>Saldo em aberto</small><strong style={{fontSize:20}}>{money(openBalance)}</strong></div>
    </section>

    <section className="adminTwoCol">
      <div className="adminStack">
        {bookings.length===0?<div className="adminEmptyState">
          <strong>Nenhuma movimentação nas próximas duas semanas.</strong>
          <p>Reservas confirmadas e hóspedes na casa aparecerão aqui.</p>
        </div>:bookings.map(booking=>{
          const paid=booking.payments
            .filter(payment=>payment.status==="PAID")
            .reduce((sum,payment)=>sum+payment.amountCents,0);
          const total=booking.quotedTotalCents||0;
          const balance=Math.max(0,total-paid);
          const openRestaurant=booking.restaurantRoomCharges.length>0;

          return <article className="adminListCard" key={booking.id}>
            <div className="adminListCardHead">
              <div>
                <small>{booking.status} • {booking.source}</small>
                <h3>{booking.name}</h3>
                <p>{booking.accommodation?.name||"Hospedagem"} • {booking.guests} hóspede(s)</p>
              </div>
              <span className={"adminChip "+(booking.status==="CHECKED_IN"?"ok":"warn")}>
                {booking.status==="CHECKED_IN"?"Na casa":"Aguardando"}
              </span>
            </div>

            <div className="adminMetaRow">
              {booking.checkIn&&<span className="adminChip">Entrada {booking.checkIn.toLocaleDateString("pt-BR")}</span>}
              {booking.checkOut&&<span className="adminChip">Saída {booking.checkOut.toLocaleDateString("pt-BR")}</span>}
              {booking.guest&&<span className="adminChip ok">CRM vinculado</span>}
              {openRestaurant&&<span className="adminChip warn">Consumo em aberto</span>}
            </div>

            <div className="adminTwoCol" style={{marginTop:16}}>
              <div className="adminSectionCard" style={{padding:16}}>
                <div className="adminStatusLine"><span>Total</span><b>{money(total)}</b></div>
                <div className="adminStatusLine"><span>Pago</span><b>{money(paid)}</b></div>
                <div className="adminStatusLine"><span>Saldo</span><b>{money(balance)}</b></div>
              </div>

              <div>
                <div className="adminInlineActions">
                  <Link className="highlight" href={"/admin/reservas/"+booking.id}>Abrir reserva →</Link>
                  {booking.guest&&<Link href={"/admin/hospedes/"+booking.guest.id}>Ficha do hóspede</Link>}
                  {booking.status==="CONFIRMED"&&<form action={pmsBookingAction}>
                    <input type="hidden" name="id" value={booking.id}/>
                    <input type="hidden" name="action" value="CHECK_IN"/>
                    <button className="highlight">Fazer check-in</button>
                  </form>}
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
                  {booking.status==="CHECKED_IN"&&booking.restaurantAccessToken&&<a
                    href={"/restaurante?booking="+booking.restaurantAccessToken}
                    target="_blank"
                    rel="noreferrer"
                  >Restaurante ↗</a>}
                </div>

                <form action={registerPayment} className="adminFormGrid" style={{marginTop:12}}>
                  <input type="hidden" name="bookingId" value={booking.id}/>
                  <label>Receber valor
                    <input name="amount" inputMode="decimal" required placeholder="R$"/>
                  </label>
                  <label>Forma
                    <select name="method" defaultValue="PIX">
                      <option value="PIX">PIX</option>
                      <option value="CARD">Cartão</option>
                      <option value="CASH">Dinheiro</option>
                      <option value="TRANSFER">Transferência</option>
                    </select>
                  </label>
                  <button className="span2">Registrar pagamento</button>
                </form>

                {booking.status==="CHECKED_IN"&&<form action={settleRestaurantFolio} style={{marginTop:10}}>
                  <input type="hidden" name="bookingId" value={booking.id}/>
                  <input type="hidden" name="method" value="ROOM_SETTLEMENT"/>
                  <button>Fechar consumo restaurante</button>
                </form>}
              </div>
            </div>
          </article>;
        })}
      </div>

      <aside className="adminSectionCard isDark">
        <small>GOVERNANÇA / HOUSEKEEPING</small>
        <h2>Limpeza pendente</h2>
        <p>{tasks.length} tarefa(s) aguardando conclusão.</p>
        {tasks.length===0?<div className="adminPageNote">Tudo em ordem.</div>:<div className="adminStack">
          {tasks.map(task=><div key={task.id} className="adminStatusLine" style={{display:"block"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
              <span><b>{task.accommodation.name}</b><br/><small>{task.type} • {task.scheduledFor.toLocaleString("pt-BR")}</small></span>
              <span className="adminChip warn">{task.status}</span>
            </div>
            <form action={updateHousekeeping} style={{display:"flex",gap:7,marginTop:10}}>
              <input type="hidden" name="id" value={task.id}/>
              <select name="status" defaultValue={task.status}>
                <option value="PENDING">Pendente</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="DONE">Concluída</option>
              </select>
              <button>Salvar</button>
            </form>
          </div>)}
        </div>}
      </aside>
    </section>
  </main>;
}
