import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";

export const dynamic="force-dynamic";

export default async function OnboardingPage(){
  await requireAdmin();

  const [admins,rooms,rates,channels,site,products,restaurantSettings]=await Promise.all([
    prisma.adminUser.count({where:{active:true}}),
    prisma.accommodation.count({where:{active:true}}),
    prisma.ratePlan.count({where:{active:true}}),
    prisma.channelIntegration.count({where:{active:true}}),
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.restaurantProduct.count({where:{active:true}}),
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  const steps=[
    {
      title:"Acesso administrativo",
      description:"Pelo menos um usuário ativo para operar a instalação.",
      done:admins>0,
      href:"/admin/usuarios",
      detail:admins+" usuário(s) ativo(s)"
    },
    {
      title:"Hospedagens",
      description:"Cadastre quartos, camas, capacidades e inventário vendável.",
      done:rooms>0,
      href:"/admin/hospedagens",
      detail:rooms+" hospedagem(ns) ativa(s)"
    },
    {
      title:"Tarifas",
      description:"Defina preço-base para as hospedagens antes de abrir reservas.",
      done:rates>0,
      href:"/admin/tarifas",
      detail:rates+" plano(s) ativo(s)"
    },
    {
      title:"Canais / iCal",
      description:"Conecte Booking, Airbnb ou outros calendários quando necessário.",
      done:channels>0,
      href:"/admin/canais",
      detail:channels+" integração(ões) ativa(s)",
      optional:true
    },
    {
      title:"Identidade do site",
      description:"Configure marca, WhatsApp, endereço, cores e imagens.",
      done:Boolean(site),
      href:"/admin/configuracoes",
      detail:site?"Configuração criada":"Ainda não inicializada"
    },
    {
      title:"Restaurante",
      description:"Publique produtos e defina horários/operação do Moriah Food.",
      done:products>0&&Boolean(restaurantSettings),
      href:"/admin/restaurante/cardapio",
      detail:products+" produto(s) ativo(s)",
      optional:true
    },
    {
      title:"Infraestrutura essencial",
      description:"Banco, sessão e URL direta para migrations precisam estar configurados.",
      done:Boolean(process.env.DATABASE_URL&&process.env.SESSION_SECRET&&process.env.DIRECT_URL),
      href:"/admin/sistema/saude",
      detail:"DATABASE_URL • SESSION_SECRET • DIRECT_URL"
    }
  ];

  const required=steps.filter(step=>!step.optional);
  const doneRequired=required.filter(step=>step.done).length;
  const progress=Math.round(doneRequired*100/Math.max(1,required.length));

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH / IMPLANTAÇÃO</small>
        <h1>Assistente de Implantação</h1>
        <p>Checklist para colocar uma nova instalação em operação sem depender do código ou de conhecimento técnico do produto.</p>
      </div>
      <div className="adminHeroStamp"><span>{progress}</span><small>%<br/>PRONTO</small></div>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <div className="adminListCardHead">
        <div><small>PROGRESSO</small><h2>{doneRequired}/{required.length} etapas essenciais</h2></div>
        <span className={"adminChip "+(progress===100?"ok":"warn")}>{progress===100?"PRONTO PARA OPERAR":"CONFIGURAÇÃO EM ANDAMENTO"}</span>
      </div>
      <div className="onboardingProgress"><i style={{width:progress+"%"}}/></div>
      <p>Integrações de canais e restaurante são opcionais para uma instalação que use apenas hospedagem.</p>
    </section>

    <section className="onboardingGrid">
      {steps.map((step,index)=><article className={"onboardingCard"+(step.done?" isDone":"")} key={step.title}>
        <div className="onboardingCardTop">
          <span>{String(index+1).padStart(2,"0")}</span>
          <b className={"adminChip "+(step.done?"ok":step.optional?"":"warn")}>{step.done?"CONCLUÍDO":step.optional?"OPCIONAL":"PENDENTE"}</b>
        </div>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        <small>{step.detail}</small>
        <Link href={step.href}>{step.done?"Revisar configuração":"Configurar agora"} →</Link>
      </article>)}
    </section>

    <section className="adminPageNote" style={{marginTop:20}}>
      <b>Objetivo comercial:</b> esta tela transforma a instalação do Moriah em um processo guiado e reduz suporte na entrega para novos clientes.
    </section>
  </main>;
}
