import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const env=(name:string)=>Boolean(process.env[name]?.trim());

export default async function SystemHealth(){
  await requireAdmin();

  const [channelErrors,failedNotifications,activeRooms,foodSettings,siteSettings,admins]=await Promise.all([
    prisma.channelIntegration.count({where:{active:true,OR:[{syncStatus:"ERROR"},{consecutiveFailures:{gt:0}}]}}),
    prisma.notificationMessage.count({where:{status:{in:["FAILED","BLOCKED"]}}}),
    prisma.accommodation.count({where:{active:true}}),
    prisma.restaurantSettings.findUnique({where:{id:"main"},select:{acceptingOrders:true}}),
    prisma.siteSettings.findUnique({where:{id:"main"},select:{id:true}}),
    prisma.adminUser.count({where:{active:true}})
  ]);

  const checks=[
    ["Banco",env("DATABASE_URL"),"DATABASE_URL"],
    ["Migrações diretas",env("DIRECT_URL"),"DIRECT_URL"],
    ["Sessão Admin",env("SESSION_SECRET"),"SESSION_SECRET"],
    ["Cron de canais",env("CRON_SECRET"),"CRON_SECRET"],
    ["Armazenamento S3",env("AWS_ACCESS_KEY_ID")&&env("AWS_SECRET_ACCESS_KEY")&&env("AWS_S3_BUCKET"),"AWS_*"],
    ["Groq",env("GROQ_API_KEY"),"GROQ_API_KEY"],
    ["Host restaurante",env("RESTAURANT_SUBDOMAIN_HOST"),"RESTAURANT_SUBDOMAIN_HOST"]
  ] as const;

  const ready=checks.filter(([,ok])=>ok).length;
  const operationalIssues=channelErrors+failedNotifications+(activeRooms?0:1)+(admins?0:1);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH / PRODUCT HARDENING</small>
        <h1>Saúde do Sistema</h1>
        <p>Diagnóstico operacional sem exibir credenciais: infraestrutura, canais, notificações e superfícies essenciais do produto.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/integracoes">Integrações →</Link>
        <Link className="adminSecondaryAction" href="/admin/canais">Canais →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Infra configurada</small><strong>{ready}/{checks.length}</strong></div>
      <div><small>Problemas operacionais</small><strong>{operationalIssues}</strong></div>
      <div><small>Hospedagens ativas</small><strong>{activeRooms}</strong></div>
      <div><small>Admins ativos</small><strong>{admins}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginTop:20}}>
      <article className="adminSectionCard isDark">
        <small>PRODUÇÃO / VARIÁVEIS</small>
        <h2>Infraestrutura</h2>
        {checks.map(([label,ok,key])=><div className="adminStatusLine" key={label}>
          <span>{label}<br/><small>{key}</small></span>
          <b className={"adminChip "+(ok?"ok":"warn")}>{ok?"CONFIGURADO":"PENDENTE"}</b>
        </div>)}
        <p>Nenhum valor secreto é enviado para o navegador; esta tela verifica apenas presença/configuração.</p>
      </article>

      <article className="adminSectionCard">
        <small>OPERAÇÃO</small>
        <h2>Superfícies críticas</h2>
        <div className="adminStatusLine"><span>Canais com falha</span><b className={"adminChip "+(channelErrors?"bad":"ok")}>{channelErrors}</b></div>
        <div className="adminStatusLine"><span>Notificações bloqueadas/falhas</span><b className={"adminChip "+(failedNotifications?"warn":"ok")}>{failedNotifications}</b></div>
        <div className="adminStatusLine"><span>Site configurado</span><b className={"adminChip "+(siteSettings?"ok":"warn")}>{siteSettings?"SIM":"NÃO"}</b></div>
        <div className="adminStatusLine"><span>Restaurante</span><b className={"adminChip "+(foodSettings?.acceptingOrders?"ok":"warn")}>{foodSettings?.acceptingOrders?"ACEITANDO":"PAUSADO"}</b></div>
        <div className="adminInlineActions" style={{marginTop:16}}>
          <Link className="highlight" href="/admin/notificacoes">Notificações →</Link>
          <Link href="/admin/restaurante">Restaurante →</Link>
          <Link href="/admin/configuracoes">Configurações →</Link>
        </div>
      </article>
    </section>

    <section className="adminPageNote" style={{marginTop:20}}>
      <b>Pronto para venda:</b> esta visão ajuda suporte e implantação a identificar configuração incompleta sem acessar Vercel, banco ou segredos do cliente.
    </section>
  </main>;
}
