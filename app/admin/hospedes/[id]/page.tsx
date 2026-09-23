import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {linkGuestBooking,updateGuest} from "../actions";

export const dynamic="force-dynamic";

export default async function GuestDetail({
  params
}:{
  params:Promise<{id:string}>
}){
  await requireAdmin();
  const {id}=await params;

  const guest=await prisma.guest.findUnique({
    where:{id},
    include:{
      bookings:{
        include:{accommodation:true},
        orderBy:{createdAt:"desc"}
      }
    }
  });
  if(!guest)notFound();

  const candidates=await prisma.bookingLead.findMany({
    where:{
      guestId:null,
      OR:[
        {phone:guest.phone},
        {name:{equals:guest.name,mode:"insensitive"}}
      ]
    },
    include:{accommodation:true},
    orderBy:{createdAt:"desc"},
    take:20
  });

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / FICHA DO HÓSPEDE</small>
        <h1>{guest.name}</h1>
        <p>{guest.phone}{guest.email?" • "+guest.email:""}{guest.document?" • "+guest.document:""}</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/hospedes">← Hóspedes</Link>
        <Link className="adminSecondaryAction" href="/admin/reservas">Reservas →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Reservas</small><strong>{guest.bookings.length}</strong></div>
      <div><small>Documento</small><strong style={{fontSize:16}}>{guest.document||"—"}</strong></div>
      <div><small>Cadastro</small><strong style={{fontSize:16}}>{guest.createdAt.toLocaleDateString("pt-BR")}</strong></div>
      <div><small>Atualização</small><strong style={{fontSize:16}}>{guest.updatedAt.toLocaleDateString("pt-BR")}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Dados do hóspede</h2>
        <form action={updateGuest} className="adminFormGrid">
          <input type="hidden" name="id" value={guest.id}/>
          <label className="span2">Nome completo
            <input name="name" required defaultValue={guest.name}/>
          </label>
          <label>Telefone / WhatsApp
            <input name="phone" required defaultValue={guest.phone}/>
          </label>
          <label>E-mail
            <input name="email" type="email" defaultValue={guest.email||""}/>
          </label>
          <label className="span2">Documento
            <input name="document" defaultValue={guest.document||""}/>
          </label>
          <label className="span2">Observações
            <textarea name="notes" rows={5} defaultValue={guest.notes||""}/>
          </label>
          <button className="span2">Salvar ficha</button>
        </form>
      </article>

      <aside className="adminSectionCard">
        <h2>Reservas para vincular</h2>
        <p>Possíveis reservas encontradas pelo nome ou telefone que ainda não têm hóspede vinculado.</p>
        {candidates.length===0?<div className="adminPageNote">Nenhuma reserva pendente de vínculo.</div>:<div className="adminStack">
          {candidates.map(booking=><div className="adminStatusLine" key={booking.id} style={{alignItems:"flex-start"}}>
            <span>
              <b>{booking.accommodation?.name||"Hospedagem"}</b><br/>
              {booking.checkIn?booking.checkIn.toLocaleDateString("pt-BR"):"Sem data"} • {booking.status}
            </span>
            <form action={linkGuestBooking}>
              <input type="hidden" name="guestId" value={guest.id}/>
              <input type="hidden" name="bookingId" value={booking.id}/>
              <button>Vincular</button>
            </form>
          </div>)}
        </div>}
      </aside>
    </section>

    <section className="adminSectionCard" style={{marginTop:20}}>
      <h2>Histórico de reservas</h2>
      <p>Reservas já vinculadas a esta ficha.</p>
      {guest.bookings.length===0?<div className="adminPageNote">Ainda não há reservas vinculadas.</div>:<div className="adminStack">
        {guest.bookings.map(booking=><article className="adminListCard" key={booking.id}>
          <div className="adminListCardHead">
            <div>
              <small>{booking.status} • {booking.source}</small>
              <h3>{booking.accommodation?.name||"Hospedagem"}</h3>
              <p>{booking.checkIn?booking.checkIn.toLocaleDateString("pt-BR"):"—"} → {booking.checkOut?booking.checkOut.toLocaleDateString("pt-BR"):"—"} • {booking.guests} hóspede(s)</p>
            </div>
            {booking.quotedTotalCents!=null&&<strong>{(booking.quotedTotalCents/100).toLocaleString("pt-BR",{style:"currency",currency:booking.quotedCurrency||"BRL"})}</strong>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
