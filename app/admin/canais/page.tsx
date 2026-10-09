import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createChannelIntegration,toggleChannelIntegration,deleteChannelIntegration,syncChannelNow} from "../actions";
import {listChannelAdapterCapabilities} from "../../../lib/channel-adapter-registry";
import CalendarExportActions from "./calendar-export-actions";
import {saveSmoobuMapping} from "./smoobu-mapping-actions";
import {importSmoobuReservationInbox,reviewSmoobuReservation} from "./smoobu-inbox-actions";
import {diagnoseSmoobuReservations} from "../../../lib/smoobu-reservation-diagnostics";
import {smoobuConfigured,getSmoobuApartments,getSmoobuReservationOverview,getSmoobuReservationPreview} from "../../../lib/smoobu-client";

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

  const smoobuMappings=await prisma.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}});
  const inbox=await prisma.smoobuReservationInbox.findMany({orderBy:{lastSeenAt:"desc"},take:60});
  const active=rows.filter(x=>x.active).length;
  const errors=rows.filter(x=>x.lastError).length;
  const adapters=listChannelAdapterCapabilities();
  const smoobuReady=smoobuConfigured();
  const smoobuResult=smoobuReady?await getSmoobuApartments().then(apartments=>({apartments,error:null as string|null})).catch(()=>({apartments:[] as {id:number;name:string}[],error:"Não foi possível validar a conexão. Confira as credenciais HMAC e a autorização da API."})):null;

  const smoobuReservations=smoobuReady?await getSmoobuReservationOverview().then(data=>({data,error:null as string|null})).catch(()=>({data:null,error:"Consulta de reservas indisponível. Confira autenticação e permissões da Smoobu."})):null;

  const smoobuPreview=smoobuReady?await getSmoobuReservationPreview().then(items=>({items,error:null as string|null})).catch(()=>({items:[] as Awaited<ReturnType<typeof getSmoobuReservationPreview>>,error:"Não foi possível carregar a prévia das reservas."})):null;

  const reservationDiagnostics=smoobuPreview&&!smoobuPreview.error?diagnoseSmoobuReservations(smoobuPreview.items,smoobuMappings):[];
  const reservationWarnings=reservationDiagnostics.filter(x=>x.issues.length>0).length;

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
      <div className="adminListCardHead"><div><small>CHANNEL MANAGER · API OFICIAL</small><h2>Smoobu — central de integração</h2><p>Diagnóstico de conexão, acomodações e pré-mapeamento do inventário.</p></div><span className={"adminChip "+(smoobuResult&&!smoobuResult.error?"ok":"warn")}>{smoobuResult&&!smoobuResult.error?"API ONLINE":"CONFIGURAÇÃO PENDENTE"}</span></div>
      <p>Conexão autenticada HMAC-SHA256, exclusivamente de leitura nesta fase. As sugestões de correspondência não são vínculos confirmados e não modificam inventário.</p>
      <div className="adminMetricStrip" style={{marginTop:16,marginBottom:18}}><div><small>Unidades Smoobu</small><strong>{smoobuResult?.apartments.length??"—"}</strong></div><div><small>Reservas externas</small><strong>{smoobuReservations?.data?.total??"—"}</strong></div><div><small>Quartos PMS</small><strong>{rooms.length}</strong></div><div><small>Vínculos confirmados</small><strong>{smoobuMappings.length}</strong></div></div>
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
      <div className="adminStatusLine"><span>Reservas Smoobu (somente leitura)</span><b className={"adminChip "+(smoobuReservations?.data?"ok":"warn")}>{smoobuReservations?.data?"API RESPONDEU":"PENDENTE"}</b></div>
      {smoobuReservations?.data&&<p>Reservas informadas pela Smoobu: <strong>{smoobuReservations.data.total}</strong>. Página {smoobuReservations.data.page} de {smoobuReservations.data.pageCount}. Prévia de {smoobuReservations.data.byApartment.length} unidade(s) nesta página, sem dados pessoais dos hóspedes.</p>}
      {smoobuReservations?.error&&<p>{smoobuReservations.error}</p>}
      {smoobuResult&&!smoobuResult.error&&<div className="adminPageNote" style={{marginTop:16}}><h3>Pré-mapeamento Smoobu ↔ PMS Moriah</h3><p>Confira os nomes antes de associar unidades. Este quadro é apenas uma sugestão visual: nenhuma associação ou reserva é gravada automaticamente.</p><div className="adminStack">{smoobuResult.apartments.map(item=>{const matches=rooms.filter(room=>room.name.trim().toLocaleLowerCase("pt-BR")===item.name.trim().toLocaleLowerCase("pt-BR"));return <div className="adminStatusLine" key={item.id}><span><strong>{item.name}</strong> (Smoobu #{item.id}) → {matches.length===1?matches[0].name:matches.length>1?"Múltiplas unidades com mesmo nome":"Sem correspondência exata"}</span><b className={"adminChip "+(matches.length===1?"ok":"warn")}>{matches.length===1?"SUGESTÃO":"REVISAR"}</b></div>})}</div><p>Antes de habilitar sincronização de inventário, valide manualmente quartos privativos, compartilhados e respectivas capacidades.</p></div>}
      {smoobuResult&&!smoobuResult.error&&<div className="adminSectionCard" style={{marginTop:18}}><h3>Vincular unidades Smoobu ao PMS</h3><p>Confirme manualmente cada vínculo. Não importa reservas nem altera disponibilidade.</p><div className="adminStack">{smoobuResult.apartments.map(item=>{const mapping=smoobuMappings.find(x=>x.smoobuApartmentId===item.id);return <form action={saveSmoobuMapping} key={item.id} className="adminFormGrid"><input type="hidden" name="smoobuApartmentId" value={item.id}/><label><strong>{item.name}</strong> · ID {item.id}</label><label>Quarto correspondente<select name="accommodationId" required defaultValue={mapping?.accommodationId||""}><option value="">Selecione o quarto</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}{room.sharedRoom?" · compartilhado ("+room.bedCount+" camas)":""}</option>)}</select></label><button type="submit">{mapping?"Atualizar vínculo":"Confirmar vínculo"}</button></form>})}</div></div>}
      {smoobuPreview&&!smoobuPreview.error&&<details style={{marginTop:18}}><summary style={{cursor:"pointer",fontWeight:700}}>Reservas externas — prévia somente leitura ({smoobuPreview.items.length}) · {reservationWarnings} com atenção</summary><p>Identificadores e datas retornados pela API, sem nomes de hóspedes. Nenhum registro é importado automaticamente.</p><div className="adminStack">{reservationDiagnostics.map(({reservation:item,issues,mappedAccommodationId},index)=><div className="adminStatusLine" key={item.externalId+"-"+index}><span><strong>Reserva #{item.externalId}</strong> · Unidade {item.apartmentId??"não identificada"} · {item.arrival||"Data pendente"} → {item.departure||"Data pendente"} · {mappedAccommodationId?"Quarto vinculado":"Sem vínculo PMS"}</span><b className={"adminChip "+(issues.length?"warn":"ok")}>{issues.length?issues.join(" · "):item.status+" · VALIDADA"}</b></div>)}</div></details>}
      {smoobuPreview?.error&&<p>{smoobuPreview.error}</p>}
      <div className="adminPageNote" style={{marginTop:18}}><h3>Central de reservas Smoobu · caixa de entrada</h3><p>Importe a primeira página de reservas para conferência e classifique cada registro. Nenhuma reserva do PMS ou disponibilidade é alterada.</p><form action={importSmoobuReservationInbox}><button type="submit" className="adminPrimaryAction">Atualizar caixa de entrada</button></form><div className="adminStack" style={{marginTop:16}}>{inbox.length===0?<p>Nenhuma reserva importada para conferência.</p>:inbox.map(item=><div className="adminStatusLine" key={item.id}><span><strong>Reserva Smoobu #{item.externalId}</strong> · Unidade {item.apartmentId??"?"} · {item.arrival||"?"} → {item.departure||"?"} · {item.externalStatus}<small style={{display:"block"}}>{item.accommodationId?"Vínculo PMS identificado":"Acomodação PMS não vinculada"} · Revisão: {item.reviewStatus}</small></span><form action={reviewSmoobuReservation} style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="hidden" name="externalId" value={item.externalId}/><select name="reviewStatus" defaultValue={item.reviewStatus}><option value="PENDING">Pendente</option><option value="REVIEWED">Conferida</option><option value="NEEDS_ATTENTION">Precisa de atenção</option></select><button type="submit">Salvar revisão</button></form></div>)}</div></div>
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
