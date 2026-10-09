import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createChannelIntegration,toggleChannelIntegration,deleteChannelIntegration,syncChannelNow} from "../actions";
import {listChannelAdapterCapabilities} from "../../../lib/channel-adapter-registry";
import CalendarExportActions from "./calendar-export-actions";
import {smoobuConfigured,getSmoobuApartments} from "../../../lib/smoobu-client";

export const dynamic="force-dynamic";

const labels:Record<string,string>={AIRBNB:"Airbnb",BOOKING:"Booking.com",ICAL:"Outro iCal/ICS"};

function health(x:{active:boolean;syncStatus:string;lastError:string|null;lastSuccessAt:Date|null}){
  if(!x.active)return ["Pausado","warn"] as const;
  if(x.syncStatus==="ERROR"||x.lastError)return ["Erro","bad"] as const;
  if(x.syncStatus==="SYNCING")return ["Sincronizando","warn"] as const;
  if(x.lastSuccessAt&&Date.now()-x.lastSuccessAt.getTime()>30*60_000)return ["Atrasado","warn"] as const;
  if(x.syncStatus==="HEALTHY")return ["Saudável","ok"] as const;
  return ["Aguardando sync","warn"] as const;
}

export default async function Page(){
  await requireAdmin();
  const [rows,rooms,blocks]=await Promise.all([
    prisma.channelIntegration.findMany({
      include:{accommodation:true,_count:{select:{blocks:true}}},
      orderBy:{createdAt:"desc"}
    }),
    prisma.accommodation.findMany({where:{active:true},orderBy:{name:"asc"}}),
    prisma.channelBlock.count()
  ]);

  const active=rows.filter(x=>x.active).length;
  const errors=rows.filter(x=>x.lastError).length;
  const adapters=listChannelAdapterCapabilities();
  const smoobuReady=smoobuConfigured();
  const smoobuResult=smoobuReady?await getSmoobuApartments().then(apartments=>({apartments,error:null as string|null})).catch(()=>({apartments:[] as {id:number;name:string}[],error:"Não foi possível validar a conexão. Confira as credenciais HMAC e a autorização da API."})):null;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / INVENTORY ENGINE</small>
        <h1>Canais</h1>
        <p>Sincronize disponibilidade via iCal/ICS e acompanhe a saúde das conexões. APIs oficiais continuam separadas até entrarem em produção.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/admin/canais/calendario">Calendário unificado →</a>
      </div>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <h2>SiteMinder — escolha como conectar</h2>
      <p>A Booking.com da Moriah (ID 15089254) informa uma conexão SiteMinder — RDX ativa. Nenhuma das opções abaixo modifica essa conexão automaticamente.</p>
      <div className="adminTwoCol" style={{marginTop:16}}>
        <article className="adminPageNote">
          <h3>1. Recuperar conexão existente</h3>
          <p>Para propriedades que já usam SiteMinder, mas perderam o acesso. Solicite recuperação ou transferência da administração da conta e preserve o vínculo atual da Booking.</p>
          <p><strong>Estado: aguardando recuperação de acesso.</strong></p>
          <a className="adminSecondaryAction" href="https://www.siteminder.com/pt/contacto/" target="_blank" rel="noopener noreferrer">Recuperar acesso / suporte ↗</a>
        </article>
        <article className="adminPageNote">
          <h3>2. Configurar uma conta nova</h3>
          <p>Para quem contratar uma nova conta SiteMinder. Antes de trocar o provedor da Booking, valide titularidade, autorização técnica e migração de reservas, quartos e tarifas.</p>
          <p><strong>Estado: aguardando conta e credenciais autorizadas.</strong></p>
          <a className="adminSecondaryAction" href="https://www.siteminder.com/" target="_blank" rel="noopener noreferrer">Conhecer SiteMinder ↗</a>
        </article>
      </div>
      <details style={{marginTop:16}}>
        <summary style={{cursor:"pointer",fontWeight:700}}>Pré-mapeamento das acomodações ({rooms.length})</summary>
        <p>Confira as unidades cadastradas antes de solicitar os identificadores externos ao SiteMinder. Este inventário é somente leitura e não modifica disponibilidade.</p>
        <div className="adminStack">
          {rooms.map(room=><div className="adminStatusLine" key={room.id}>
            <span>{room.name} {room.sharedRoom?"· compartilhado · "+room.bedCount+" cama(s)":"· privativo"}</span>
            <b className="adminChip warn">ID externo pendente</b>
          </div>)}
        </div>
      </details>
      <p style={{marginTop:16}}>Integração API ainda não habilitada: ambos os caminhos exigem documentação oficial, mapeamento de quartos/camas e testes de sincronização antes de qualquer ativação. O iCal existente continua independente.</p>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <h2>Smoobu — integração por API</h2>
      <p>Conexão de leitura com autenticação HMAC-SHA256. O acesso exige uma conta Smoobu com API habilitada e duas variáveis de ambiente configuradas no servidor.</p>
      <div className="adminStatusLine">
        <span>Credenciais de API</span>
        <b className={"adminChip "+(smoobuReady?"ok":"warn")}>{smoobuReady?"CONFIGURADAS":"PENDENTES"}</b>
      </div>
      <div className="adminStatusLine">
        <span>Teste de consulta de acomodações</span>
        <b className={"adminChip "+(smoobuResult&&!smoobuResult.error?"ok":"warn")}>{smoobuResult&&!smoobuResult.error?"CONECTADO":"NÃO VALIDADO"}</b>
      </div>
      {smoobuResult?.error&&<p>{smoobuResult.error}</p>}
      {smoobuResult&&!smoobuResult.error&&<details style={{marginTop:12}}>
        <summary style={{cursor:"pointer",fontWeight:700}}>Acomodações retornadas ({smoobuResult.apartments.length})</summary>
        <div className="adminStack">{smoobuResult.apartments.map(item=><div className="adminStatusLine" key={item.id}><span>{item.name}</span><b className="adminChip">ID {item.id}</b></div>)}</div>
      </details>}
      <p style={{marginTop:12}}>Configuração: SMOOBU_API_KEY e SMOOBU_API_SECRET no ambiente da Vercel. Nenhum segredo é exibido no painel. Esta fase não importa reservas nem altera tarifas ou disponibilidade.</p>
      <a className="adminSecondaryAction" href="https://support.smoobu.com/hc/en-us/articles/360003170740-Use-the-Smoobu-API-get-an-API-key-set-up-webhooks-and-sign-your-requests" target="_blank" rel="noopener noreferrer">Como obter as credenciais ↗</a>
    </section>

    <section className="adminMetricStrip">
      <div><small>Conexões</small><strong>{rows.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Bloqueios importados</small><strong>{blocks}</strong></div>
      <div><small>Com atenção</small><strong>{errors}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Novo adapter iCal</h2>
        <p>Use a URL HTTPS do calendário exportado pelo canal para bloquear datas automaticamente.</p>
        <form action={createChannelIntegration} className="adminFormGrid">
          <label>Canal
            <select name="provider" required>
              <option value="AIRBNB">Airbnb via iCal</option>
              <option value="BOOKING">Booking.com via iCal</option>
              <option value="ICAL">Outro iCal/ICS</option>
            </select>
          </label>
          <label>Nome da conexão
            <input name="name" required placeholder="Ex.: Booking Quarto 01"/>
          </label>
          <label className="span2">Hospedagem
            <select name="accommodationId" required>
              <option value="">Selecione</option>
              {rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label className="span2">URL do calendário
            <input name="importUrl" type="url" required placeholder="https://...ics"/>
          </label>
          <button className="span2">Adicionar conexão</button>
        </form>
      </article>

      <aside className="adminSectionCard">
        <h2>Capacidades</h2>
        <p>O painel diferencia o que já funciona do que está apenas preparado na arquitetura.</p>
        <div className="adminStack">
          {adapters.map(adapter=><div className="adminStatusLine" key={adapter.kind}>
            <span>{adapter.label}</span>
            <b className={"adminChip "+(adapter.implemented?"ok":"warn")}>{adapter.implemented?"DISPONÍVEL":"PREPARADO"}</b>
          </div>)}
        </div>
      </aside>
    </section>

    <section className="adminPageNote" style={{marginBottom:20}}>
      <strong>Sincronização automática protegida.</strong>{" "}
      Quando a disponibilidade pública é consultada, o Moriah atualiza apenas canais que já estão com a próxima sincronização vencida.
      Antes de confirmar uma reserva, o sistema força uma atualização crítica de todos os canais ativos daquela hospedagem.
      O cron diário permanece como contingência compatível com o plano Vercel Hobby.
    </section>

    {rows.length===0?<section className="adminEmptyState">
      <strong>Nenhum canal conectado.</strong>
      <p>Adicione o primeiro calendário iCal para começar a sincronização de inventário.</p>
    </section>:<section className="adminStack">
      {rows.map(channel=>{
        const [status,statusClass]=health(channel);
        return <article className="adminListCard" key={channel.id}>
          <div className="adminListCardHead">
            <div>
              <small>{labels[channel.provider]||channel.provider}</small>
              <h3>{channel.name}</h3>
              <p>{channel.accommodation?.name||"Sem hospedagem"} • {channel.integrationType==="ICAL"?"iCal / ICS":channel.integrationType.replaceAll("_"," ")}</p>
            </div>
            <span className={"adminChip "+statusClass}>{status}</span>
          </div>

          <div className="adminMetaRow">
            <span className="adminChip">{channel._count.blocks} bloqueio(s)</span>
            {channel.lastAttemptAt&&<span className="adminChip">Tentativa {channel.lastAttemptAt.toLocaleString("pt-BR")}</span>}
            {channel.lastSuccessAt&&<span className="adminChip">Sucesso {channel.lastSuccessAt.toLocaleString("pt-BR")}</span>}
            {channel.nextSyncAt&&<span className="adminChip">Próxima devida {channel.nextSyncAt.toLocaleString("pt-BR")}</span>}
            {channel.consecutiveFailures>0&&<span className="adminChip">{channel.consecutiveFailures} falha(s) seguida(s)</span>}
            {channel.syncDurationMs!=null&&<span className="adminChip">{channel.syncDurationMs} ms</span>}
          </div>

          {channel.exportToken
            ?<CalendarExportActions path={"/api/calendar/"+channel.exportToken}/>
            :<div className="adminPageNote" style={{marginTop:14}}>Calendário de saída ainda não disponível para esta conexão.</div>
          }

          {channel.lastError&&<div className="adminPageNote" style={{marginTop:14}}>Último erro: {channel.lastError}</div>}

          <div className="adminInlineActions">
            <form action={syncChannelNow}><input type="hidden" name="id" value={channel.id}/><button className="highlight">Sincronizar agora</button></form>
            <form action={toggleChannelIntegration}><input type="hidden" name="id" value={channel.id}/><button>{channel.active?"Pausar":"Ativar"}</button></form>
            <form action={deleteChannelIntegration}><input type="hidden" name="id" value={channel.id}/><button className="danger">Excluir</button></form>
          </div>
        </article>;
      })}
    </section>}
  </main>;
}
