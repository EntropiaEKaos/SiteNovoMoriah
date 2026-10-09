import {simulateApprovedDailyRates} from "../../../lib/smoobu-rate-simulation";
import {stageSmoobuDailyRates,reviewSmoobuDailyRate} from "./smoobu-rate-actions";
import {getSmoobuDailyRates} from "../../../lib/smoobu-rates";
import {saveOtaRoomLink,stageOtaPrice,applyOtaPriceToSite} from "./ota-room-actions";
import {Prisma} from "@prisma/client";
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

  // A preview deployment may share a database where migrations have not run yet.
  // Never let an unapplied integration migration break the existing channels dashboard.
  let rateSnapshotReady=true;
  let stagedRateCount=0;
  let stagedRates:Awaited<ReturnType<typeof prisma.smoobuDailyRateSnapshot.findMany>>=[];
  try{[stagedRateCount,stagedRates]=await Promise.all([prisma.smoobuDailyRateSnapshot.count(),prisma.smoobuDailyRateSnapshot.findMany({orderBy:[{date:"asc"},{smoobuApartmentId:"asc"}],take:60})]);}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2021","P2022"].includes(error.code))rateSnapshotReady=false;else throw error;}
  let otaSchemaReady=true;
  let otaLinks:Awaited<ReturnType<typeof prisma.otaRoomLink.findMany>>=[];
  try{otaLinks=await prisma.otaRoomLink.findMany({orderBy:[{provider:"asc"},{externalRoomId:"asc"}]});}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2021","P2022"].includes(error.code))otaSchemaReady=false;else throw error;}
  let smoobuSchemaReady=true;
  let smoobuMappings:Array<{smoobuApartmentId:number;accommodationId:string}>=[];
  let inbox:Awaited<ReturnType<typeof prisma.smoobuReservationInbox.findMany>>=[];
  try{
    [smoobuMappings,inbox]=await Promise.all([
      prisma.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}}),
      prisma.smoobuReservationInbox.findMany({orderBy:{lastSeenAt:"desc"},take:60})
    ]);
  }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2021","P2022"].includes(error.code))smoobuSchemaReady=false;
    else throw error;
  }
  const approvedRateSimulations=rooms.map(room=>{
    const approved=stagedRates.filter(rate=>rate.accommodationId===room.id&&rate.reviewStatus==="APPROVED");
    if(!approved.length)return null;
    const first=approved[0].date;
    const next=new Date(Date.parse(first+"T00:00:00Z")+86400000).toISOString().slice(0,10);
    const simulation=simulateApprovedDailyRates({checkIn:first,checkOut:next,basePriceCents:room.priceCents,sharedRoom:room.sharedRoom,requestedUnits:1,approvedRates:approved.map(rate=>({date:rate.date,priceCents:rate.priceCents,minNights:rate.minNights,available:rate.available,reviewStatus:rate.reviewStatus}))});
    return {roomName:room.name,...simulation[0]};
  }).filter((x):x is NonNullable<typeof x>=>x!==null);
  const active=rows.filter(x=>x.active).length;
  const errors=rows.filter(x=>x.lastError).length;
  const adapters=listChannelAdapterCapabilities();
  const smoobuReady=smoobuConfigured();
  const smoobuResult=smoobuReady?await getSmoobuApartments().then(apartments=>({apartments,error:null as string|null})).catch(()=>({apartments:[] as {id:number;name:string}[],error:"Não foi possível validar a conexão. Confira as credenciais HMAC e a autorização da API."})):null;

  const smoobuReservations=smoobuReady?await getSmoobuReservationOverview().then(data=>({data,error:null as string|null})).catch(()=>({data:null,error:"Consulta de reservas indisponível. Confira autenticação e permissões da Smoobu."})):null;

  const smoobuPreview=smoobuReady?await getSmoobuReservationPreview().then(items=>({items,error:null as string|null})).catch(()=>({items:[] as Awaited<ReturnType<typeof getSmoobuReservationPreview>>,error:"Não foi possível carregar a prévia das reservas."})):null;

  const smoobuRates=smoobuReady&&smoobuResult&&!smoobuResult.error&&smoobuResult.apartments.length>0?await getSmoobuDailyRates(smoobuResult.apartments.map(x=>x.id)).then(items=>({items,error:null as string|null})).catch(()=>({items:[] as Awaited<ReturnType<typeof getSmoobuDailyRates>>,error:"Tarifas indisponíveis ou sem autorização. Nenhum preço foi alterado."})):null;

  const reservationDiagnostics=smoobuPreview&&!smoobuPreview.error?diagnoseSmoobuReservations(smoobuPreview.items,smoobuMappings):[];
  const reservationWarnings=reservationDiagnostics.filter(x=>x.issues.length>0).length;
  const unmappedSiteRooms=rooms.filter(room=>!smoobuMappings.some(mapping=>mapping.accommodationId===room.id));

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
      <h2>Booking.com e Airbnb — quartos e preços do site</h2>
      <p>Vincule IDs de quartos recebidos dos canais às acomodações existentes no Moriah. O cadastro é expansível: novos quartos ativos aparecem automaticamente. IDs e preços são preenchidos manualmente até existir uma API de tarifas autorizada.</p>
      {!otaSchemaReady?<p role="alert">Migração de vínculos Booking/Airbnb pendente. Os demais recursos do painel continuam disponíveis.</p>:<>
        <div className="adminMetricStrip"><div><small>Quartos do site</small><strong>{rooms.length}</strong></div><div><small>Booking vinculados</small><strong>{otaLinks.filter(x=>x.provider==="BOOKING").length}</strong></div><div><small>Airbnb vinculados</small><strong>{otaLinks.filter(x=>x.provider==="AIRBNB").length}</strong></div></div>
        <form action={saveOtaRoomLink} className="adminFormGrid" style={{marginTop:16}}>
          <label>Canal<select name="provider" required><option value="BOOKING">Booking.com</option><option value="AIRBNB">Airbnb</option></select></label>
          <label>ID do quarto no canal<input name="externalRoomId" maxLength={120} required placeholder="ID exato do anúncio/quarto"/></label>
          <label>Nome no canal<input name="externalRoomName" maxLength={160} placeholder="Ex.: Suíte 01"/></label>
          <label>Quarto correspondente no site<select name="accommodationId" required defaultValue=""><option value="">Selecione</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}{room.roomNumber?" · nº "+room.roomNumber:""}{room.sharedRoom?" · compartilhado":""}</option>)}</select></label>
          <button type="submit" className="adminPrimaryAction">Salvar vínculo</button>
        </form>
        <h3 style={{marginTop:20}}>Vínculos cadastrados e conferência de tarifas</h3>
        <p>Preço de referência digitado manualmente. Só altera o preço base do quarto no site após confirmação explícita. Tarifas por data e planos tarifários podem seguir regras próprias.</p>
        <div className="adminStack">{otaLinks.length===0?<p>Nenhum quarto externo vinculado.</p>:otaLinks.map(link=>{const room=rooms.find(x=>x.id===link.accommodationId);return <article className="adminPageNote" key={link.id}>
          <strong>{link.provider==="BOOKING"?"Booking.com":"Airbnb"} · {link.externalRoomName||link.externalRoomId}</strong>
          <p>ID {link.externalRoomId} → {room?.name||"Quarto não encontrado"} · Preço base atual: {room?.priceCents==null?"Não definido":(room.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>
          <form action={stageOtaPrice} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"end"}}>
            <input type="hidden" name="provider" value={link.provider}/><input type="hidden" name="externalRoomId" value={link.externalRoomId}/>
            <label>Preço de referência (R$)<input name="priceBRL" inputMode="decimal" placeholder="199,90" required/></label>
            <button type="submit">Guardar preço para revisão</button>
          </form>
          {link.proposedPriceCents!==null&&<form action={applyOtaPriceToSite} style={{marginTop:12}}>
            <input type="hidden" name="provider" value={link.provider}/><input type="hidden" name="externalRoomId" value={link.externalRoomId}/>
            <p>Preço proposto: <strong>{(link.proposedPriceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong> · Origem: manual</p>
            <label><input type="checkbox" name="confirm" value="yes" required/> Confirmo que desejo alterar o preço base deste quarto no site.</label>
            <button type="submit">Aplicar preço ao site</button>
          </form>}
        </article>})}</div>
      </>}
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
      <div className="adminPageNote" style={{marginTop:16}}>
        <h3>Importar tarifas para conferência</h3>
        <p><strong>{stagedRateCount} tarifas diárias</strong> armazenadas. A importação é manual e não altera o preço publicado no site.</p>
        {approvedRateSimulations.length>0&&<div className="adminPageNote" style={{marginTop:12}}><h4>Simulação de tarifas aprovadas (sem publicar)</h4><p>Comparação ilustrativa de uma diária por quarto, usando o preço base cadastrado. Planos tarifários, promoções e regras dinâmicas do motor de reservas podem alterar o valor final.</p>{approvedRateSimulations.map(item=><p key={item.roomName+"-"+item.date}><strong>{item.roomName}</strong> · {item.date} · Base: {(item.currentPriceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} · Proposta: {item.proposedPriceCents===null?item.reason:(item.proposedPriceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+" ("+item.reason+")"}</p>)}</div>}
        {rateSnapshotReady&&stagedRates.length>0&&<div className="adminStack" style={{marginTop:12}}>{stagedRates.map(rate=><div className="adminStatusLine" key={rate.id}><span><strong>{rooms.find(room=>room.id===rate.accommodationId)?.name||"Quarto não encontrado"}</strong> · {rate.date} · {(rate.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}<small style={{display:"block"}}>Smoobu #{rate.smoobuApartmentId} · Estadia mínima {rate.minNights??"—"} · Disponibilidade {rate.available??"—"}</small></span><div><b className="adminChip">{rate.reviewStatus==="PENDING"?"Aguardando revisão":rate.reviewStatus==="APPROVED"?"Aprovada (não publicada)":"Rejeitada"}</b><form action={reviewSmoobuDailyRate} style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><input type="hidden" name="id" value={rate.id}/><input type="hidden" name="expectedUpdatedAt" value={rate.updatedAt.toISOString()}/><button type="submit" name="status" value="APPROVED" disabled={rate.reviewStatus==="APPROVED"}>Aprovar</button><button type="submit" name="status" value="REJECTED" disabled={rate.reviewStatus==="REJECTED"}>Rejeitar</button></form></div></div>)}</div>}
        {!rateSnapshotReady?<p role="alert">Migração da tabela de tarifas pendente.</p>:!smoobuSchemaReady?<p role="alert">Migração dos vínculos Smoobu pendente.</p>:smoobuMappings.length===0?<p>Vincule pelo menos um quarto da Smoobu antes de importar tarifas.</p>:<form action={stageSmoobuDailyRates}><button type="submit" className="adminPrimaryAction">Importar 90 dias para conferência</button></form>}
      </div>
      <details style={{marginTop:16}}>
        <summary style={{cursor:"pointer",fontWeight:700}}>Tarifas Smoobu por data — prévia de até 90 dias</summary>
        <p>Valores consultados diretamente na API Smoobu, sem alterar preços do site, tarifas do Booking/Airbnb ou disponibilidade. A moeda deve ser conferida na configuração da propriedade antes de qualquer publicação.</p>
        {smoobuRates?.error&&<p role="alert">{smoobuRates.error}</p>}
        {smoobuRates&&!smoobuRates.error&&<><p><strong>{smoobuRates.items.length} tarifas diárias</strong> recebidas para {smoobuResult?.apartments.length??0} unidades. Mostrando as primeiras 45 datas/unidades.</p>
          <div className="adminStack">{smoobuRates.items.slice(0,45).map(item=><div className="adminStatusLine" key={item.apartmentId+"-"+item.date}>
            <span><strong>{smoobuResult?.apartments.find(a=>a.id===item.apartmentId)?.name||"Unidade "+item.apartmentId}</strong> · {item.date} · {item.priceCents===null?"Sem tarifa":(item.priceCents/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" (moeda da Smoobu)"}<small style={{display:"block"}}>Mínimo {item.minNights??"—"} noite(s) · Disponibilidade {item.available??"—"}</small></span>
            <b className="adminChip">Somente leitura</b>
          </div>)}</div>
        </>}
      </details>
      <div className="adminStatusLine"><span>Reservas Smoobu (somente leitura)</span><b className={"adminChip "+(smoobuReservations?.data?"ok":"warn")}>{smoobuReservations?.data?"API RESPONDEU":"PENDENTE"}</b></div>
      {smoobuReservations?.data&&<p>Reservas informadas pela Smoobu: <strong>{smoobuReservations.data.total}</strong>. Página {smoobuReservations.data.page} de {smoobuReservations.data.pageCount}. Prévia de {smoobuReservations.data.byApartment.length} unidade(s) nesta página, sem dados pessoais dos hóspedes.</p>}
      {smoobuReservations?.error&&<p>{smoobuReservations.error}</p>}
      {smoobuResult&&!smoobuResult.error&&<div className="adminPageNote" style={{marginTop:16}}><h3>Pré-mapeamento Smoobu ↔ PMS Moriah</h3><p>Confira os nomes antes de associar unidades. Este quadro é apenas uma sugestão visual: nenhuma associação ou reserva é gravada automaticamente.</p><div className="adminStack">{smoobuResult.apartments.map(item=>{const matches=rooms.filter(room=>room.name.trim().toLocaleLowerCase("pt-BR")===item.name.trim().toLocaleLowerCase("pt-BR"));return <div className="adminStatusLine" key={item.id}><span><strong>{item.name}</strong> (Smoobu #{item.id}) → {matches.length===1?matches[0].name:matches.length>1?"Múltiplas unidades com mesmo nome":"Sem correspondência exata"}</span><b className={"adminChip "+(matches.length===1?"ok":"warn")}>{matches.length===1?"SUGESTÃO":"REVISAR"}</b></div>})}</div><p>Antes de habilitar sincronização de inventário, valide manualmente quartos privativos, compartilhados e respectivas capacidades.</p></div>}
      {smoobuResult&&!smoobuResult.error&&smoobuSchemaReady&&<div className="adminSectionCard" style={{marginTop:18}}><h3>Vincular unidades Smoobu ao PMS</h3><p><strong>{rooms.length} quartos ativos no site</strong> · {smoobuMappings.length} vínculos confirmados · {unmappedSiteRooms.length} quartos do site sem vínculo. Suporte a novos quartos sem limite fixo de três.</p><p>Os quartos ativos do site aparecem automaticamente aqui, inclusive novos quartos cadastrados no futuro. Confirme cada vínculo individualmente; uma unidade Smoobu não pode ser atribuída a dois quartos. Não importa reservas nem altera disponibilidade.</p><div className="adminStack">{smoobuResult.apartments.map(item=>{const mapping=smoobuMappings.find(x=>x.smoobuApartmentId===item.id);return <form action={saveSmoobuMapping} key={item.id} className="adminFormGrid"><input type="hidden" name="smoobuApartmentId" value={item.id}/><label><strong>{item.name}</strong> · ID {item.id}</label><label>Quarto correspondente<select name="accommodationId" required defaultValue={mapping?.accommodationId||""}><option value="">Selecione o quarto</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}{room.roomNumber?" · nº "+room.roomNumber:""}{" · capacidade "+room.capacity}{room.sharedRoom?" · compartilhado ("+room.bedCount+" camas)":""}</option>)}</select></label><label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" name="confirmSharedRoom" value="yes"/> Confirmo que verifiquei se a unidade representa o quarto inteiro ou uma cama (obrigatório para quartos compartilhados).</label><button type="submit">{mapping?"Atualizar vínculo":"Confirmar vínculo"}</button></form>})}</div></div>}
      {smoobuPreview&&!smoobuPreview.error&&<details style={{marginTop:18}}><summary style={{cursor:"pointer",fontWeight:700}}>Reservas externas — prévia somente leitura ({smoobuPreview.items.length}) · {reservationWarnings} com atenção</summary><p>Identificadores e datas retornados pela API, sem nomes de hóspedes. Nenhum registro é importado automaticamente.</p><div className="adminStack">{reservationDiagnostics.map(({reservation:item,issues,mappedAccommodationId},index)=><div className="adminStatusLine" key={item.externalId+"-"+index}><span><strong>Reserva #{item.externalId}</strong> · Unidade {item.apartmentId??"não identificada"} · {item.arrival||"Data pendente"} → {item.departure||"Data pendente"} · {mappedAccommodationId?"Quarto vinculado":"Sem vínculo PMS"}</span><b className={"adminChip "+(issues.length?"warn":"ok")}>{issues.length?issues.join(" · "):item.status+" · VALIDADA"}</b></div>)}</div></details>}
      {smoobuPreview?.error&&<p>{smoobuPreview.error}</p>}
      {smoobuSchemaReady?<div className="adminPageNote" style={{marginTop:18}}><h3>Central de reservas Smoobu · caixa de entrada</h3><p>Importe a primeira página de reservas para conferência e classifique cada registro. Nenhuma reserva do PMS ou disponibilidade é alterada.</p><form action={importSmoobuReservationInbox}><button type="submit" className="adminPrimaryAction">Atualizar caixa de entrada</button></form><div className="adminStack" style={{marginTop:16}}>{inbox.length===0?<p>Nenhuma reserva importada para conferência.</p>:inbox.map(item=><div className="adminStatusLine" key={item.id}><span><strong>Reserva Smoobu #{item.externalId}</strong> · Unidade {item.apartmentId??"?"} · {item.arrival||"?"} → {item.departure||"?"} · {item.externalStatus}<small style={{display:"block"}}>{item.accommodationId?"Vínculo PMS identificado":"Acomodação PMS não vinculada"} · Revisão: {item.reviewStatus}</small></span><form action={reviewSmoobuReservation} style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="hidden" name="externalId" value={item.externalId}/><select name="reviewStatus" defaultValue={item.reviewStatus}><option value="PENDING">Pendente</option><option value="REVIEWED">Conferida</option><option value="NEEDS_ATTENTION">Precisa de atenção</option></select><button type="submit">Salvar revisão</button></form></div>)}</div></div>:null}
      {!smoobuSchemaReady&&<div className="adminPageNote" role="alert">Migrações Smoobu pendentes. O painel de canais existente continua disponível; vínculos e caixa de entrada serão liberados após aplicar as migrações.</div>}
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
