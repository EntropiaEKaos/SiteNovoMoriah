import Link from "next/link";
import {prisma} from "../../lib/prisma";
import {requireAdmin} from "../../lib/admin-auth";

export const dynamic="force-dynamic";

const DAY=86400000;
const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function overlapNights(checkIn:Date|null,checkOut:Date|null,from:Date,to:Date){
  if(!checkIn||!checkOut)return 0;
  const start=Math.max(checkIn.getTime(),from.getTime());
  const end=Math.min(checkOut.getTime(),to.getTime());
  return Math.max(0,Math.ceil((end-start)/DAY));
}

function totalNights(checkIn:Date|null,checkOut:Date|null){
  if(!checkIn||!checkOut)return 0;
  return Math.max(1,Math.ceil((checkOut.getTime()-checkIn.getTime())/DAY));
}

export default async function Admin(){
  await requireAdmin();

  const now=new Date();
  const since=new Date(now.getTime()-30*DAY);
  const soldStatuses=["CONFIRMED","CHECKED_IN","CHECKED_OUT"];

  const [
    activeRooms,
    roomsTotal,
    bookingsTotal,
    guests,
    media,
    posts,
    channels,
    channelsUnhealthy,
    foodOrders30,
    housekeepingPending,
    chatOpen,
    chatMessages,
    chatBooking,
    chatWhatsapp,
    soldStays,
    leads30Rows,
    payments30,
    notificationReady
  ]=await Promise.all([
    prisma.accommodation.count({where:{active:true}}),
    prisma.accommodation.count(),
    prisma.bookingLead.count(),
    prisma.guest.count(),
    prisma.media.count(),
    prisma.blogPost.count(),
    prisma.channelIntegration.count(),
    prisma.channelIntegration.count({
      where:{
        active:true,
        OR:[
          {syncStatus:"ERROR"},
          {consecutiveFailures:{gt:0}}
        ]
      }
    }),
    prisma.restaurantOrder.findMany({
      where:{createdAt:{gte:since},status:{not:"CANCELLED"}},
      select:{totalCents:true}
    }),
    prisma.housekeepingTask.count({where:{status:{not:"DONE"}}}),
    prisma.chatMetric.count({where:{kind:"OPEN",createdAt:{gte:since}}}),
    prisma.chatMetric.count({where:{kind:"MESSAGE",createdAt:{gte:since}}}),
    prisma.chatMetric.count({where:{kind:"BOOKING_CTA",createdAt:{gte:since}}}),
    prisma.chatMetric.count({where:{kind:"WHATSAPP",createdAt:{gte:since}}}),
    prisma.bookingLead.findMany({
      where:{
        status:{in:soldStatuses},
        checkIn:{lt:now},
        checkOut:{gt:since}
      },
      select:{
        status:true,
        checkIn:true,
        checkOut:true,
        quotedTotalCents:true,
        source:true
      }
    }),
    prisma.bookingLead.findMany({
      where:{createdAt:{gte:since}},
      select:{status:true,source:true}
    }),
    prisma.payment.findMany({
      where:{status:"PAID",paidAt:{gte:since}},
      select:{amountCents:true}
    }),
    prisma.notificationMessage.count({where:{status:{in:["READY","FAILED","BLOCKED"]}}})
  ]);

  const occupiedNights=soldStays.reduce(
    (sum,booking)=>sum+overlapNights(booking.checkIn,booking.checkOut,since,now),
    0
  );

  const stayRevenue30=soldStays.reduce((sum,booking)=>{
    if(!booking.quotedTotalCents)return sum;
    const overlap=overlapNights(booking.checkIn,booking.checkOut,since,now);
    if(!overlap)return sum;
    const nights=totalNights(booking.checkIn,booking.checkOut);
    return sum+Math.round(booking.quotedTotalCents*(overlap/nights));
  },0);

  const availableNights=Math.max(1,activeRooms*30);
  const occupancy=Math.min(100,Math.round(occupiedNights*100/availableNights));
  const adr=occupiedNights?Math.round(stayRevenue30/occupiedNights):0;
  const revpar=Math.round(stayRevenue30/availableNights);
  const paid30=payments30.reduce((sum,payment)=>sum+payment.amountCents,0);
  const foodRevenue30=foodOrders30.reduce((sum,order)=>sum+order.totalCents,0);
  const foodTicket=foodOrders30.length?Math.round(foodRevenue30/foodOrders30.length):0;

  const leads30=leads30Rows.length;
  const soldLeadCount=leads30Rows.filter(row=>soldStatuses.includes(row.status)).length;
  const cancelled=leads30Rows.filter(row=>row.status==="CANCELLED").length;
  const noShow=leads30Rows.filter(row=>row.status==="NO_SHOW").length;
  const conversion=leads30?Math.round(soldLeadCount*100/leads30):0;
  const cancellationRate=leads30?Math.round(cancelled*100/leads30):0;
  const noShowRate=leads30?Math.round(noShow*100/leads30):0;

  const sources=new Map<string,number>();
  for(const row of leads30Rows)sources.set(row.source,(sources.get(row.source)||0)+1);
  const sourceRanking=[...sources.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);

  const modules=[
    ["Hospedagens",roomsTotal,"/admin/hospedagens","Inventário"],
    ["Reservas",bookingsTotal,"/admin/reservas","Comercial"],
    ["Hóspedes",guests,"/admin/hospedes","CRM"],
    ["PMS",housekeepingPending,"/admin/pms","Operação"],
    ["Moriah Food",foodOrders30.length,"/admin/restaurante","Restaurante"],
    ["Mídia",media,"/admin/midia","Conteúdo"],
    ["Blog",posts,"/admin/blog","Editorial"],
    ["Canais",channels,"/admin/canais","Distribuição"]
  ];

  return <main className="adminDashboard">
    <section className="adminWelcome">
      <div>
        <div className="adminKicker">COMMAND CENTER 4.0 • ÚLTIMOS 30 DIAS</div>
        <h1>Bom trabalho.<br/><em>Vamos operar.</em></h1>
        <p>Hospedagem, receita, ocupação, restaurante, atendimento e saúde operacional em uma visão executiva.</p>
      </div>
      <div className="adminHeroStamp"><span>{occupancy}</span><small>%<br/>OCUPAÇÃO</small></div>
    </section>

    <section className="adminStats">
      {[
        ["Receita de hospedagem",money(stayRevenue30),"Revenue"],
        ["ADR",money(adr),"Diária média"],
        ["RevPAR",money(revpar),"Receita/quarto"],
        ["Recebido",money(paid30),"Caixa"]
      ].map(([name,value,type])=><article key={String(name)}>
        <small>{type}</small>
        <strong>{value}</strong>
        <span>{name}</span>
      </article>)}
    </section>

    <section className="adminMetricStrip" style={{marginBottom:24}}>
      <div><small>Conversão</small><strong>{conversion}%</strong></div>
      <div><small>Cancelamento</small><strong>{cancellationRate}%</strong></div>
      <div><small>No-show</small><strong>{noShowRate}%</strong></div>
      <div><small>Room nights</small><strong>{occupiedNights}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:26}}>
      <article className="adminSectionCard isDark">
        <small>OPERAÇÃO / SAÚDE</small>
        <h2>Agora</h2>
        <div className="adminStatusLine"><span>Governança pendente</span><b>{housekeepingPending}</b></div>
        <div className="adminStatusLine"><span>Canais com falha</span><b className={"adminChip "+(channelsUnhealthy?"bad":"ok")}>{channelsUnhealthy}</b></div>
        <div className="adminStatusLine"><span>Notificações pendentes</span><b className={"adminChip "+(notificationReady?"warn":"ok")}>{notificationReady}</b></div>
        <div className="adminStatusLine"><span>Hospedagens ativas</span><b>{activeRooms}</b></div>
        <div className="adminInlineActions" style={{marginTop:18}}>
          <Link href="/admin/pms">Front Desk</Link>
          <Link href="/admin/canais">Canais</Link>
          <Link href="/admin/notificacoes">Notificações</Link>
        </div>
      </article>

      <article className="adminSectionCard">
        <small>MORIAH FOOD / 30 DIAS</small>
        <h2>{money(foodRevenue30)}</h2>
        <div className="adminStatusLine"><span>Pedidos</span><b>{foodOrders30.length}</b></div>
        <div className="adminStatusLine"><span>Ticket médio</span><b>{money(foodTicket)}</b></div>
        <div className="adminInlineActions" style={{marginTop:18}}>
          <Link className="highlight" href="/admin/restaurante/pedidos">KDS →</Link>
          <Link href="/admin/restaurante/bi">BI Food →</Link>
        </div>
      </article>
    </section>

    <div className="adminSectionHead">
      <div><small>ATALHOS OPERACIONAIS</small><h2>Seu negócio, por área.</h2></div>
      <Link href="/admin/integracoes">Diagnóstico de integrações →</Link>
    </div>

    <section className="adminModuleGrid">
      {modules.map(([name,count,href,type],index)=><Link
        key={String(name)}
        href={String(href)}
        className="adminModuleCard"
      >
        <div><small>{String(index+1).padStart(2,"0")} • {type}</small><span>{count}</span></div>
        <h3>{name}</h3>
        <p>Abrir módulo <b>↗</b></p>
      </Link>)}
    </section>

    <section className="adminSplit">
      <article className="adminDarkPanel">
        <small>REVENUE COMMAND</small>
        <h2>Preço certo.<br/>Na hora certa.</h2>
        <p>Ocupação {occupancy}% • ADR {money(adr)} • RevPAR {money(revpar)}.</p>
        <div>
          <Link href="/admin/tarifas">Tarifas →</Link>
          <Link href="/admin/preco-dinamico">Preço dinâmico →</Link>
          <Link href="/admin/promocoes">Promoções →</Link>
        </div>
      </article>

      <article className="adminAiPanel">
        <small>ATENDIMENTO / 30 DIAS</small>
        <h2>Assistente Moriah</h2>
        <div className="adminMiniStats">
          {[
            ["Chats",chatOpen],
            ["Mensagens",chatMessages],
            ["Reserva",chatBooking],
            ["WhatsApp",chatWhatsapp]
          ].map(([name,value])=><div key={String(name)}>
            <strong>{value}</strong><span>{name}</span>
          </div>)}
        </div>
        <p>Métricas agregadas sem armazenar o conteúdo das conversas.</p>
      </article>
    </section>

    <section className="adminSectionCard" style={{marginTop:26}}>
      <div className="adminListCardHead">
        <div>
          <small>AQUISIÇÃO / 30 DIAS</small>
          <h2>Origem dos leads</h2>
          <p>{leads30} lead(s) no período.</p>
        </div>
      </div>
      {sourceRanking.length===0?<div className="adminPageNote">Sem leads no período.</div>:sourceRanking.map(([source,count],index)=><div className="adminStatusLine" key={source}>
        <span>#{index+1} {source}</span>
        <b>{count} • {Math.round(count*100/Math.max(1,leads30))}%</b>
      </div>)}
    </section>
  </main>;
}
