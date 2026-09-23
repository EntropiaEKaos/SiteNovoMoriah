import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createChannelIntegration,toggleChannelIntegration,deleteChannelIntegration,syncChannelNow} from "../actions";
import {listChannelAdapterCapabilities} from "../../../lib/channel-adapter-registry";

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
            {channel.lastSuccessAt&&<span className="adminChip">Sucesso {channel.lastSuccessAt.toLocaleString("pt-BR")}</span>}
            {channel.syncDurationMs!=null&&<span className="adminChip">{channel.syncDurationMs} ms</span>}
          </div>

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
