import {prisma} from "../../lib/prisma";
import BookingCalendar from "./booking-calendar";

export const dynamic="force-dynamic";

export default async function Page({
  searchParams
}:{
  searchParams:Promise<{
    indisponivel?:string;
    accommodationId?:string;
    checkIn?:string;
    checkOut?:string;
    guests?:string;
  }>;
}){
  const q=await searchParams;
  const rooms=await prisma.accommodation.findMany({
    where:{active:true},
    orderBy:[{featured:"desc"},{name:"asc"}]
  });

  const selected=q.accommodationId&&rooms.some(room=>room.id===q.accommodationId)
    ?q.accommodationId
    :(rooms[0]?.id||"");

  return <main className="bookingPage">
    <a className="bookingBack" href="/">← Voltar para a Moriah</a>

    <div className="bookingHero">
      <small>POUSADA MORIAH • PRAIA GRANDE</small>
      <h1>Sua estadia<br/>começa aqui<span>.</span></h1>
      <p>
        Escolha sua hospedagem, datas e quantidade de hóspedes. Para quartos compartilhados,
        o sistema consulta a quantidade real de camas disponíveis.
      </p>
    </div>

    {q.indisponivel&&<p style={{
      maxWidth:1000,
      padding:16,
      background:"#fff3cd",
      border:"1px solid #e8b600"
    }}>
      Não há vagas suficientes para esse período e quantidade de hóspedes.
      Escolha outras datas ou reduza a quantidade.
    </p>}

    <BookingCalendar
      rooms={rooms.map(room=>({
        id:room.id,
        name:room.name,
        sharedRoom:room.sharedRoom,
        bedCount:room.bedCount,
        capacity:room.capacity
      }))}
      selected={selected}
      initialCheckIn={q.checkIn}
      initialCheckOut={q.checkOut}
      initialGuests={q.guests}
    />
  </main>;
}
