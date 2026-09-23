import Link from "next/link";
import {prisma} from "../../lib/prisma";

export const dynamic="force-dynamic";

export default async function Admin(){
  const since=new Date(Date.now()-30*86400000);
  const [
    rooms,
    bookings,
    media,
    posts,
    channels,
    foodOrders,
    housekeepingPending,
    chatOpen,
    chatMessages,
    chatBooking,
    chatWhatsapp,
    confirmed30,
    leads30
  ]=await Promise.all([
    prisma.accommodation.count(),
    prisma.bookingLead.count(),
    prisma.media.count(),
    prisma.blogPost.count(),
    prisma.channelIntegration.count(),
    prisma.restaurantOrder.count({where:{createdAt:{gte:since},status:{not:"CANCELLED"}}}),
    prisma.housekeepingTask.count({where:{status:{not:"DONE"}}}),
    prisma.chatMetric.count({where:{kind:"OPEN"}}),
    prisma.chatMetric.count({where:{kind:"MESSAGE"}}),
    prisma.chatMetric.count({where:{kind:"BOOKING_CTA"}}),
    prisma.chatMetric.count({where:{kind:"WHATSAPP"}}),
    prisma.bookingLead.findMany({where:{status:"CONFIRMED",createdAt:{gte:since}},select:{quotedTotalCents:true}}),
    prisma.bookingLead.count({where:{createdAt:{gte:since}}})
  ]);

  const revenue30=confirmed30.reduce((sum,b)=>sum+(b.quotedTotalCents||0),0);
  const confirmedCount=confirmed30.length;
  const conversion=leads30?Math.round(confirmedCount*100/leads30):0;

  const modules=[
    ["Hospedagens",rooms,"/admin/hospedagens","Inventário"],
    ["Reservas",bookings,"/admin/reservas","Comercial"],
    ["PMS",housekeepingPending,"/admin/pms","Operação"],
    ["Moriah Food",foodOrders,"/admin/restaurante","Restaurante"],
    ["Mídia",media,"/admin/midia","Conteúdo"],
    ["Blog",posts,"/admin/blog","Editorial"],
    ["Canais",channels,"/admin/canais","Distribuição"]
  ];

  return <main className="adminDashboard">
    <section className="adminWelcome">
      <div>
        <div className="adminKicker">CENTRAL OPERACIONAL • TEMPO REAL</div>
        <h1>Bom trabalho.<br/><em>Vamos operar.</em></h1>
        <p>Conteúdo, hospedagem, receita, cozinha e atendimento reunidos em uma central desenhada para decisões rápidas.</p>
      </div>
      <div className="adminHeroStamp"><span>30</span><small>DIAS<br/>DE VISÃO</small></div>
    </section>

    <section className="adminStats">
      {[
        ["Receita confirmada",(revenue30/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Revenue"],
        ["Reservas confirmadas",confirmedCount,"Conversão"],
        ["Leads",leads30,"Pipeline"],
        ["Conversão",conversion+"%","Performance"]
      ].map(([name,value,type])=><article key={String(name)}>
        <small>{type}</small>
        <strong>{value}</strong>
        <span>{name}</span>
      </article>)}
    </section>

    <div className="adminSectionHead">
      <div><small>ATALHOS OPERACIONAIS</small><h2>Seu negócio, por área.</h2></div>
      <Link href="/admin/integracoes">Diagnóstico de integrações →</Link>
    </div>

    <section className="adminModuleGrid">
      {modules.map(([name,count,href,type],index)=><Link key={String(name)} href={String(href)} className="adminModuleCard">
        <div><small>{String(index+1).padStart(2,"0")} • {type}</small><span>{count}</span></div>
        <h3>{name}</h3>
        <p>Abrir módulo <b>↗</b></p>
      </Link>)}
    </section>

    <section className="adminSplit">
      <article className="adminDarkPanel">
        <small>REVENUE COMMAND</small>
        <h2>Preço certo.<br/>Na hora certa.</h2>
        <p>Gerencie tarifas, regras dinâmicas e campanhas sem sair da central.</p>
        <div>
          <Link href="/admin/tarifas">Tarifas →</Link>
          <Link href="/admin/preco-dinamico">Preço dinâmico →</Link>
          <Link href="/admin/promocoes">Promoções →</Link>
        </div>
      </article>

      <article className="adminAiPanel">
        <small>ATENDIMENTO</small>
        <h2>Assistente Moriah</h2>
        <div className="adminMiniStats">
          {[
            ["Chats",chatOpen],
            ["Mensagens",chatMessages],
            ["Reserva",chatBooking],
            ["WhatsApp",chatWhatsapp]
          ].map(([name,value])=><div key={String(name)}><strong>{value}</strong><span>{name}</span></div>)}
        </div>
        <p>Métricas agregadas sem armazenar o conteúdo das conversas.</p>
      </article>
    </section>
  </main>;
}
