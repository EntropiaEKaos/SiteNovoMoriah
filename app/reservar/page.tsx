import {prisma} from "../../lib/prisma";
import BookingCalendar from "./booking-calendar";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";
import LanguageSwitcher from "../language-switcher";

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
  const locale=await getSiteLocale();
  const roomsRaw=await prisma.accommodation.findMany({
    where:{active:true},
    orderBy:[{featured:"desc"},{name:"asc"}]
  });

  const rooms=roomsRaw.map(room=>localizeRecord(room,locale)!).filter(Boolean);
  const t=locale==="en"?{back:"← Back to Moriah",eyebrow:"POUSADA MORIAH • PRAIA GRANDE",title:"Your stay starts here.",body:"Choose your stay, dates and number of guests. For shared rooms, the system checks the actual number of beds available.",unavailable:"There are not enough spots for this period and number of guests. Choose other dates or reduce the quantity."}:locale==="es"?{back:"← Volver a Moriah",eyebrow:"POUSADA MORIAH • PRAIA GRANDE",title:"Tu estancia comienza aquí.",body:"Elige tu hospedaje, fechas y cantidad de huéspedes. Para habitaciones compartidas, el sistema consulta la cantidad real de camas disponibles.",unavailable:"No hay plazas suficientes para este período y cantidad de huéspedes. Elige otras fechas o reduce la cantidad."}:{back:"← Voltar para a Moriah",eyebrow:"POUSADA MORIAH • PRAIA GRANDE",title:"Sua estadia começa aqui.",body:"Escolha sua hospedagem, datas e quantidade de hóspedes. Para quartos compartilhados, o sistema consulta a quantidade real de camas disponíveis.",unavailable:"Não há vagas suficientes para esse período e quantidade de hóspedes. Escolha outras datas ou reduza a quantidade."};

  const selected=q.accommodationId&&rooms.some(room=>room.id===q.accommodationId)
    ?q.accommodationId
    :(rooms[0]?.id||"");

  return <main className="bookingPage">
    <div className="bookingTopActions"><a className="bookingBack" href="/">{t.back}</a><LanguageSwitcher locale={locale}/></div>

    <div className="bookingHero">
      <small>{t.eyebrow}</small>
      <h1>{t.title}<span>.</span></h1>
      <p>{t.body}</p>
    </div>

    {q.indisponivel&&<p style={{
      maxWidth:1000,
      padding:16,
      background:"#fff3cd",
      border:"1px solid #e8b600"
    }}>
      {t.unavailable}
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
      locale={locale}
    />
  </main>;
}
