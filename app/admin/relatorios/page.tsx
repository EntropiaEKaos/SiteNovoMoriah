import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";

export const dynamic="force-dynamic";

const DAY=86400000;
const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=(value:number)=>value.toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";

function nights(checkIn:Date|null,checkOut:Date|null,from:Date,to:Date){
  if(!checkIn||!checkOut)return 0;
  const start=Math.max(checkIn.getTime(),from.getTime());
  const end=Math.min(checkOut.getTime(),to.getTime());
  return Math.max(0,Math.ceil((end-start)/DAY));
}

export default async function ReportsPage(){
  await requireAdmin();

  const now=new Date();
  const since=new Date(now.getTime()-30*DAY);
  const prevStart=new Date(now.getTime()-60*DAY);

  const [
    activeRooms,
    currentBookings,
    previousBookings,
    payments,
    previousPayments,
    foodOrders,
    previousFoodOrders,
    purchases,
    leads,
    charges,
    housekeeping
  ]=await Promise.all([
    prisma.accommodation.count({where:{active:true}}),
    prisma.bookingLead.findMany({
      where:{status:{in:["CONFIRMED","CHECKED_IN","CHECKED_OUT"]},checkIn:{lt:now},checkOut:{gt:since}},
      select:{checkIn:true,checkOut:true,quotedTotalCents:true,source:true,status:true}
    }),
    prisma.bookingLead.findMany({
      where:{status:{in:["CONFIRMED","CHECKED_IN","CHECKED_OUT"]},checkIn:{lt:since},checkOut:{gt:prevStart}},
      select:{checkIn:true,checkOut:true,quotedTotalCents:true}
    }),
    prisma.payment.findMany({where:{status:"PAID",paidAt:{gte:since}},select:{amountCents:true,method:true,source:true}}),
    prisma.payment.findMany({where:{status:"PAID",paidAt:{gte:prevStart,lt:since}},select:{amountCents:true}}),
    prisma.restaurantOrder.findMany({where:{createdAt:{gte:since},status:{not:"CANCELLED"}},select:{totalCents:true,source:true,paymentMethod:true}}),
    prisma.restaurantOrder.findMany({where:{createdAt:{gte:prevStart,lt:since},status:{not:"CANCELLED"}},select:{totalCents:true}}),
    prisma.restaurantPurchase.findMany({where:{purchasedAt:{gte:since},status:{not:"CANCELLED"}},select:{totalCents:true}}),
    prisma.bookingLead.findMany({where:{createdAt:{gte:since}},select:{status:true,source:true}}),
    prisma.bookingCharge.findMany({where:{createdAt:{gte:since}},select:{amountCents:true,category:true}}),
    prisma.housekeepingTask.count({where:{status:{not:"DONE"}}})
  ]);

  const roomNights=currentBookings.reduce((sum,row)=>sum+nights(row.checkIn,row.checkOut,since,now),0);
  const prevRoomNights=previousBookings.reduce((sum,row)=>sum+nights(row.checkIn,row.checkOut,prevStart,since),0);
  const lodgingRevenue=currentBookings.reduce((sum,row)=>{
    if(!row.quotedTotalCents)return sum;
    const stay=Math.max(1,Math.ceil(((row.checkOut?.getTime()||0)-(row.checkIn?.getTime()||0))/DAY));
    const inPeriod=nights(row.checkIn,row.checkOut,since,now);
    return sum+Math.round(row.quotedTotalCents*(inPeriod/stay));
  },0);
  const prevLodgingRevenue=previousBookings.reduce((sum,row)=>{
    if(!row.quotedTotalCents)return sum;
    const stay=Math.max(1,Math.ceil(((row.checkOut?.getTime()||0)-(row.checkIn?.getTime()||0))/DAY));
    const inPeriod=nights(row.checkIn,row.checkOut,prevStart,since);
    return sum+Math.round(row.quotedTotalCents*(inPeriod/stay));
  },0);
  const received=payments.reduce((sum,row)=>sum+row.amountCents,0);
  const prevReceived=previousPayments.reduce((sum,row)=>sum+row.amountCents,0);
  const foodRevenue=foodOrders.reduce((sum,row)=>sum+row.totalCents,0);
  const prevFoodRevenue=previousFoodOrders.reduce((sum,row)=>sum+row.totalCents,0);
  const purchaseTotal=purchases.reduce((sum,row)=>sum+row.totalCents,0);
  const extras=charges.reduce((sum,row)=>sum+row.amountCents,0);
  const availableNights=Math.max(1,activeRooms*30);
  const occupancy=Math.min(100,roomNights/availableNights*100);
  const adr=roomNights?Math.round(lodgingRevenue/roomNights):0;
  const revpar=Math.round(lodgingRevenue/availableNights);
  const foodTicket=foodOrders.length?Math.round(foodRevenue/foodOrders.length):0;
  const operationalRevenue=lodgingRevenue+foodRevenue+extras;
  const simpleContribution=operationalRevenue-purchaseTotal;

  const soldStatuses=new Set(["CONFIRMED","CHECKED_IN","CHECKED_OUT"]);
  const soldLeads=leads.filter(row=>soldStatuses.has(row.status)).length;
  const conversion=leads.length?soldLeads/leads.length*100:0;
  const cancelRate=leads.length?leads.filter(row=>row.status==="CANCELLED").length/leads.length*100:0;

  const sourceMap=new Map<string,number>();
  for(const row of leads)sourceMap.set(row.source,(sourceMap.get(row.source)||0)+1);
  const sources=[...sourceMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);

  const methodMap=new Map<string,number>();
  for(const row of payments)methodMap.set(row.method,(methodMap.get(row.method)||0)+row.amountCents);
  const methods=[...methodMap.entries()].sort((a,b)=>b[1]-a[1]);

  const restaurantSourceMap=new Map<string,number>();
  for(const row of foodOrders)restaurantSourceMap.set(row.source,(restaurantSourceMap.get(row.source)||0)+row.totalCents);
  const restaurantSources=[...restaurantSourceMap.entries()].sort((a,b)=>b[1]-a[1]);

  const delta=(current:number,previous:number)=>{
    if(!previous)return current>0?100:0;
    return (current-previous)/previous*100;
  };

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH / EXECUTIVE REPORTS</small>
        <h1>Financeiro & Relatórios</h1>
        <p>Uma leitura executiva dos últimos 30 dias: hospedagem, caixa, restaurante, compras, aquisição e eficiência operacional.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin">Command Center →</Link>
        <Link className="adminSecondaryAction" href="/admin/restaurante/bi">BI Restaurante →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Receita operacional</small><strong style={{fontSize:20}}>{money(operationalRevenue)}</strong></div>
      <div><small>Recebido em caixa</small><strong style={{fontSize:20}}>{money(received)}</strong></div>
      <div><small>Compras Food</small><strong style={{fontSize:20}}>{money(purchaseTotal)}</strong></div>
      <div><small>Contribuição simples</small><strong style={{fontSize:20}}>{money(simpleContribution)}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginTop:20}}>
      <article className="adminSectionCard isDark">
        <small>HOSPEDAGEM / 30 DIAS</small>
        <h2>{money(lodgingRevenue)}</h2>
        <div className="adminStatusLine"><span>Ocupação</span><b>{pct(occupancy)}</b></div>
        <div className="adminStatusLine"><span>Room nights</span><b>{roomNights}</b></div>
        <div className="adminStatusLine"><span>ADR</span><b>{money(adr)}</b></div>
        <div className="adminStatusLine"><span>RevPAR</span><b>{money(revpar)}</b></div>
        <div className="adminStatusLine"><span>Receita vs. 30d anteriores</span><b className={"adminChip "+(delta(lodgingRevenue,prevLodgingRevenue)>=0?"ok":"warn")}>{pct(delta(lodgingRevenue,prevLodgingRevenue))}</b></div>
        <div className="adminStatusLine"><span>Room nights anteriores</span><b>{prevRoomNights}</b></div>
      </article>

      <article className="adminSectionCard">
        <small>RESTAURANTE / 30 DIAS</small>
        <h2>{money(foodRevenue)}</h2>
        <div className="adminStatusLine"><span>Pedidos</span><b>{foodOrders.length}</b></div>
        <div className="adminStatusLine"><span>Ticket médio</span><b>{money(foodTicket)}</b></div>
        <div className="adminStatusLine"><span>Receita vs. 30d anteriores</span><b className={"adminChip "+(delta(foodRevenue,prevFoodRevenue)>=0?"ok":"warn")}>{pct(delta(foodRevenue,prevFoodRevenue))}</b></div>
        <div className="adminStatusLine"><span>Compras registradas</span><b>{money(purchaseTotal)}</b></div>
        <div className="adminInlineActions" style={{marginTop:16}}>
          <Link className="highlight" href="/admin/restaurante/bi">Abrir CMV →</Link>
          <Link href="/admin/restaurante/compras">Compras →</Link>
        </div>
      </article>
    </section>

    <section className="adminTwoCol" style={{marginTop:20}}>
      <article className="adminSectionCard">
        <small>AQUISIÇÃO / FUNIL</small>
        <h2>{leads.length} leads</h2>
        <div className="adminStatusLine"><span>Conversão para venda</span><b>{pct(conversion)}</b></div>
        <div className="adminStatusLine"><span>Cancelamento</span><b>{pct(cancelRate)}</b></div>
        {sources.length===0?<div className="adminPageNote">Sem leads no período.</div>:sources.map(([source,count],index)=><div className="adminStatusLine" key={source}>
          <span>#{index+1} {source}</span><b>{count} • {Math.round(count*100/Math.max(1,leads.length))}%</b>
        </div>)}
      </article>

      <article className="adminSectionCard">
        <small>CAIXA / RECEBIMENTOS</small>
        <h2>{money(received)}</h2>
        <div className="adminStatusLine"><span>Vs. 30d anteriores</span><b className={"adminChip "+(delta(received,prevReceived)>=0?"ok":"warn")}>{pct(delta(received,prevReceived))}</b></div>
        {methods.length===0?<div className="adminPageNote">Sem pagamentos registrados.</div>:methods.map(([method,value])=><div className="adminStatusLine" key={method}>
          <span>{method}</span><b>{money(value)}</b>
        </div>)}
      </article>
    </section>

    <section className="adminTwoCol" style={{marginTop:20}}>
      <article className="adminSectionCard">
        <small>MORIAH FOOD / ORIGEM</small>
        <h2>Canais de venda</h2>
        {restaurantSources.length===0?<div className="adminPageNote">Sem vendas no período.</div>:restaurantSources.map(([source,value])=><div className="adminStatusLine" key={source}>
          <span>{source}</span><b>{money(value)}</b>
        </div>)}
      </article>
      <article className="adminSectionCard isDark">
        <small>OPERAÇÃO</small>
        <h2>Pendências</h2>
        <div className="adminStatusLine"><span>Governança em aberto</span><b className={"adminChip "+(housekeeping?"warn":"ok")}>{housekeeping}</b></div>
        <div className="adminStatusLine"><span>Adicionais hospedagem</span><b>{money(extras)}</b></div>
        <p>Este relatório é gerencial. Compras do restaurante entram como saída operacional simples; despesas gerais da pousada ainda não fazem parte de uma contabilidade completa.</p>
      </article>
    </section>
  </main>;
}
