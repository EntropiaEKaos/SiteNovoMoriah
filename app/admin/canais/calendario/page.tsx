import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import AdminCalendar from "./admin-calendar";
import {
  createManualBlock,
  rotateCalendarWidgetToken,
  saveCalendarWidgetSettings
} from "./actions";
import WidgetEmbedCode from "./widget-embed-code";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();

  const now=new Date();
  const from=new Date(now);
  from.setUTCDate(from.getUTCDate()-60);
  const to=new Date(now);
  to.setUTCDate(to.getUTCDate()+180);

  const [external,internal,holds,manual,rooms,widget]=await Promise.all([
    prisma.channelBlock.findMany({
      where:{endsAt:{gt:from},startsAt:{lt:to}},
      include:{integration:{include:{accommodation:true}}},
      orderBy:{startsAt:"asc"},
      take:600
    }),
    prisma.bookingLead.findMany({
      where:{
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkIn:{not:null,lt:to},
        checkOut:{not:null,gt:from}
      },
      include:{accommodation:true,guest:true},
      orderBy:{checkIn:"asc"},
      take:600
    }),
    prisma.inventoryHold.findMany({
      where:{expiresAt:{gt:now},checkIn:{lt:to},checkOut:{gt:from}},
      include:{accommodation:true},
      orderBy:{checkIn:"asc"},
      take:300
    }),
    prisma.manualInventoryBlock.findMany({
      where:{startsAt:{lt:to},endsAt:{gt:from}},
      include:{accommodation:true},
      orderBy:{startsAt:"asc"},
      take:300
    }),
    prisma.accommodation.findMany({
      where:{active:true},
      orderBy:[{roomNumber:"asc"},{name:"asc"}]
    }),
    prisma.calendarWidgetSettings.findUnique({where:{id:"main"}})
  ]);

  const events=[
    ...external.map(x=>({
      id:"channel:"+x.id,
      entityId:x.id,
      start:x.startsAt.toISOString(),
      end:x.endsAt.toISOString(),
      title:x.summary||"Bloqueio externo",
      kind:"CHANNEL" as const,
      status:x.integration.provider,
      roomId:x.integration.accommodationId||"",
      room:x.integration.accommodation?.name||"Sem hospedagem",
      guest:null,
      guests:null,
      valueCents:null,
      currency:"BRL",
      source:x.integration.provider,
      notes:null
    })),
    ...internal.map(x=>({
      id:"booking:"+x.id,
      entityId:x.id,
      start:x.checkIn!.toISOString(),
      end:x.checkOut!.toISOString(),
      title:x.name,
      kind:"BOOKING" as const,
      status:x.status,
      roomId:x.accommodationId||"",
      room:x.accommodation?.name||"Sem hospedagem",
      guest:x.guest?.name||x.name,
      guests:x.guests,
      valueCents:x.quotedTotalCents,
      currency:x.quotedCurrency||"BRL",
      source:x.source,
      notes:x.message
    })),
    ...holds.map(x=>({
      id:"hold:"+x.id,
      entityId:x.id,
      start:x.checkIn.toISOString(),
      end:x.checkOut.toISOString(),
      title:"Hold temporário",
      kind:"HOLD" as const,
      status:"HOLD",
      roomId:x.accommodationId,
      room:x.accommodation.name,
      guest:null,
      guests:null,
      valueCents:null,
      currency:"BRL",
      source:"SITE",
      notes:"Expira "+x.expiresAt.toLocaleString("pt-BR")
    })),
    ...manual.map(x=>({
      id:"manual:"+x.id,
      entityId:x.id,
      start:x.startsAt.toISOString(),
      end:x.endsAt.toISOString(),
      title:x.reason,
      kind:"MANUAL" as const,
      status:"MANUAL",
      roomId:x.accommodationId,
      room:x.accommodation.name,
      guest:null,
      guests:null,
      valueCents:null,
      currency:"BRL",
      source:"MORIAH",
      notes:x.notes
    }))
  ];

  return <main className="adminPage reservationMapPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / INVENTÁRIO</small>
        <h1>Mapa de Reservas</h1>
        <p>Reservas, hóspedes, check-ins, canais, holds e bloqueios operacionais em uma única linha do tempo.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/admin/reservas">Reservas →</a>
        <a className="adminSecondaryAction" href="/admin/pms">PMS →</a>
      </div>
    </section>

    <section className="calendarWidgetAdmin">
      <article className="adminSectionCard">
        <div className="adminListCardHead">
          <div><small>CALENDÁRIO EXTERNO</small><h2>Widget incorporável</h2><p>Leve a disponibilidade para outro site com iframe, sem expor o painel administrativo.</p></div>
          <span className={"adminChip "+(widget?.active?"ok":"warn")}>{widget?.active?"ATIVO":"CONFIGURAR"}</span>
        </div>
        <form action={saveCalendarWidgetSettings} className="adminFormGrid cols3">
          <label className="span2">Título<input name="title" defaultValue={widget?.title||"Disponibilidade Moriah"}/></label>
          <label>Subtítulo<input name="subtitle" defaultValue={widget?.subtitle||""}/></label>
          <label>Cor principal<input name="primaryColor" type="color" defaultValue={widget?.primaryColor||"#0b607a"}/></label>
          <label>Cor de destaque<input name="accentColor" type="color" defaultValue={widget?.accentColor||"#ffc845"}/></label>
          <label className="calendarWidgetCheck"><input name="active" type="checkbox" defaultChecked={widget?.active!==false}/> Widget ativo</label>
          <label className="calendarWidgetCheck"><input name="showPrices" type="checkbox" defaultChecked={widget?.showPrices!==false}/> Mostrar preços</label>
          <label className="calendarWidgetCheck"><input name="allowBooking" type="checkbox" defaultChecked={widget?.allowBooking!==false}/> Permitir ir para reserva</label>
          <label className="calendarWidgetCheck"><input name="compact" type="checkbox" defaultChecked={widget?.compact===true}/> Modo compacto</label>
          <button className="span2">Salvar widget</button>
        </form>
        {widget?<WidgetEmbedCode token={widget.publicToken}/>:<div className="adminPageNote">Salve as configurações uma vez para gerar o token e o código do widget.</div>}
        {widget&&<form action={rotateCalendarWidgetToken} style={{marginTop:10}}><button className="danger">Trocar token do widget</button></form>}
      </article>
    </section>

    <AdminCalendar
      events={events}
      rooms={rooms.map(r=>({
        id:r.id,
        name:r.name,
        roomNumber:r.roomNumber,
        capacity:r.capacity
      }))}
    />
  </main>;
}
