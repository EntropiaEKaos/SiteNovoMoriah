import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {setBookingStatus} from "../actions";

export const dynamic="force-dynamic";

const editableLabels={
  NEW:"Nova",
  CONTACTED:"Contatada",
  CONFIRMED:"Confirmada",
  CANCELLED:"Cancelada"
} as const;

const statusLabel:Record<string,string>={
  NEW:"Nova",
  CONTACTED:"Contatada",
  CONFIRMED:"Confirmada",
  CANCELLED:"Cancelada",
  CHECKED_IN:"Hospedado",
  CHECKED_OUT:"Finalizada",
  NO_SHOW:"No-show"
};

const statusClass=(status:string)=>{
  if(["CONFIRMED","CHECKED_IN","CHECKED_OUT"].includes(status))return "ok";
  if(["CANCELLED","NO_SHOW"].includes(status))return "bad";
  return "warn";
};

export default async function Page({
  searchParams
}:{
  searchParams:Promise<{status?:string;source?:string;q?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const status=String(params.status||"").trim();
  const source=String(params.source||"").trim();
  const q=String(params.q||"").trim();

  const where={
    ...(status?{status}:{}),
    ...(source?{source}:{}),
    ...(q?{
      OR:[
        {name:{contains:q,mode:"insensitive" as const}},
        {phone:{contains:q,mode:"insensitive" as const}},
        {email:{contains:q,mode:"insensitive" as const}}
      ]
    }:{})
  };

  const [leads,total,newCount,confirmed,checkedIn]=await Promise.all([
    prisma.bookingLead.findMany({
      where,
      include:{
        accommodation:true,
        guest:true,
        payments:{where:{status:"PAID"}}
      },
      orderBy:{createdAt:"desc"},
      take:150
    }),
    prisma.bookingLead.count(),
    prisma.bookingLead.count({where:{status:"NEW"}}),
    prisma.bookingLead.count({where:{status:"CONFIRMED"}}),
    prisma.bookingLead.count({where:{status:"CHECKED_IN"}})
  ]);

  const sources=Array.from(new Set(leads.map(item=>item.source))).sort();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / COMERCIAL</small>
        <h1>Reservas</h1>
        <p>Pipeline comercial, valores, hóspedes e status operacional em uma única visão conectada ao PMS e ao Mapa de Reservas.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/canais/calendario">Mapa de Reservas →</Link>
        <Link className="adminSecondaryAction" href="/admin/pms">Front Desk →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Total histórico</small><strong>{total}</strong></div>
      <div><small>Novas</small><strong>{newCount}</strong></div>
      <div><small>Confirmadas</small><strong>{confirmed}</strong></div>
      <div><small>Na casa</small><strong>{checkedIn}</strong></div>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <h2>Filtrar pipeline</h2>
      <form method="get" className="adminFormGrid cols3">
        <label>Busca
          <input name="q" defaultValue={q} placeholder="Nome, telefone ou e-mail"/>
        </label>
        <label>Status
          <select name="status" defaultValue={status}>
            <option value="">Todos</option>
            {Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Origem
          <select name="source" defaultValue={source}>
            <option value="">Todas</option>
            {sources.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button>Aplicar filtros</button>
        {(q||status||source)&&<Link className="adminSecondaryAction" href="/admin/reservas">Limpar</Link>}
      </form>
    </section>

    {leads.length===0?<section className="adminEmptyState">
      <strong>Nenhuma reserva encontrada.</strong>
      <p>Ajuste os filtros ou aguarde novas solicitações do site.</p>
    </section>:<section className="adminStack">
      {leads.map((booking,index)=>{
        const paid=booking.payments.reduce((sum,payment)=>sum+payment.amountCents,0);
        const totalCents=booking.quotedTotalCents||0;
        const balance=Math.max(0,totalCents-paid);
        const editable=booking.status in editableLabels;

        return <article className="adminListCard" key={booking.id}>
          <div className="adminListCardHead">
            <div>
              <small>{String(index+1).padStart(2,"0")} • {booking.source}</small>
              <h3>{booking.name}</h3>
              <p>{booking.phone}{booking.email?" • "+booking.email:""}</p>
            </div>
            <span className={"adminChip "+statusClass(booking.status)}>{statusLabel[booking.status]||booking.status}</span>
          </div>

          <div className="adminMetaRow">
            <span className="adminChip">{booking.accommodation?.name||"Sem hospedagem"}</span>
            <span className="adminChip">{booking.guests} hóspede(s)</span>
            {booking.checkIn&&<span className="adminChip">{booking.checkIn.toLocaleDateString("pt-BR")} → {booking.checkOut?.toLocaleDateString("pt-BR")||"—"}</span>}
            {booking.guest&&<span className="adminChip ok">CRM vinculado</span>}
          </div>

          <div className="adminTwoCol" style={{marginTop:16}}>
            <div>
              {booking.message&&<div className="adminPageNote">{booking.message}</div>}
              <div className="adminInlineActions">
                {booking.guest&&<Link href={"/admin/hospedes/"+booking.guest.id}>Ficha do hóspede</Link>}
                <Link href="/admin/canais/calendario">Ver no mapa</Link>
                {["CONFIRMED","CHECKED_IN"].includes(booking.status)&&<Link className="highlight" href="/admin/pms">Abrir no PMS</Link>}
              </div>
            </div>

            <div className="adminSectionCard" style={{padding:16}}>
              <div className="adminStatusLine"><span>Total cotado</span><b>{totalCents?(totalCents/100).toLocaleString("pt-BR",{style:"currency",currency:booking.quotedCurrency||"BRL"}):"—"}</b></div>
              <div className="adminStatusLine"><span>Recebido</span><b>{(paid/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b></div>
              <div className="adminStatusLine"><span>Saldo</span><b>{(balance/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b></div>
            </div>
          </div>

          {editable&&<form className="adminFormGrid" action={setBookingStatus} style={{marginTop:16,paddingTop:16,borderTop:"1px solid #ebe6da"}}>
            <input type="hidden" name="id" value={booking.id}/>
            <label>Status comercial
              <select name="status" defaultValue={booking.status}>
                {Object.entries(editableLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button>Atualizar status</button>
          </form>}
        </article>;
      })}
    </section>}
  </main>;
}
