import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import AdminCalendar from "./admin-calendar";
import {createManualBlock} from "./actions";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();

  const now=new Date();
  const from=new Date(now);
  from.setUTCDate(from.getUTCDate()-60);
  const to=new Date(now);
  to.setUTCDate(to.getUTCDate()+180);

  const [external,internal,holds,manual,rooms]=await Promise.all([
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
    })
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

    <section className="adminSectionCard" style={{marginBottom:18}}>
      <h2>Novo bloqueio manual</h2>
      <p>Use para manutenção, uso interno, interdição ou qualquer indisponibilidade operacional.</p>
      <form action={createManualBlock} className="adminFormGrid cols3">
        <label>Hospedagem
          <select name="accommodationId" required>
            <option value="">Selecione</option>
            {rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}
          </select>
        </label>
        <label>Início<input name="startsAt" type="date" required/></label>
        <label>Fim<input name="endsAt" type="date" required/></label>
        <label>Motivo<input name="reason" required maxLength={160} placeholder="Ex.: Manutenção do ar-condicionado"/></label>
        <label className="span2">Observações<input name="notes" maxLength={1500} placeholder="Opcional"/></label>
        <button className="span2">Criar bloqueio</button>
      </form>
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
