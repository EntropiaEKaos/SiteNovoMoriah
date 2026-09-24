import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {
  cancelNotification,
  createNotification,
  dispatchNotification,
  markNotificationSent,
  saveNotificationRule
} from "./actions";

export const dynamic="force-dynamic";

const statusClass=(status:string)=>{
  if(status==="SENT")return "ok";
  if(status==="FAILED"||status==="BLOCKED")return "bad";
  if(status==="CANCELLED")return "";
  return "warn";
};

export default async function Page(){
  await requireAdmin();

  const [messages,cfg,rules]=await Promise.all([
    prisma.notificationMessage.findMany({
      orderBy:{createdAt:"desc"},
      take:120
    }),
    prisma.integrationSettings.findUnique({where:{id:"main"}}),
    prisma.notificationRule.findMany({orderBy:[{module:"asc"},{label:"asc"}]})
  ]);

  const sent=messages.filter(message=>message.status==="SENT").length;
  const ready=messages.filter(message=>message.status==="READY").length;
  const blocked=messages.filter(message=>["BLOCKED","FAILED"].includes(message.status)).length;

  const emailReady=Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL);
  const pushPublicReady=Boolean(
    cfg?.firebaseApiKey&&
    cfg.firebaseProjectId&&
    cfg.firebaseMessagingSenderId&&
    cfg.firebaseAppId&&
    cfg.firebaseVapidKey
  );
  const pushServerReady=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / ENGAJAMENTO</small>
        <h1>Notificações</h1>
        <p>Central de mensagens internas, WhatsApp assistido e e-mail, com fila e diagnóstico de providers.</p>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Mensagens</small><strong>{messages.length}</strong></div>
      <div><small>Enviadas</small><strong>{sent}</strong></div>
      <div><small>Prontas</small><strong>{ready}</strong></div>
      <div><small>Bloqueadas / falhas</small><strong>{blocked}</strong></div>
    </section>

    <section className="notificationRulesSection">
      <div className="adminListCardHead">
        <div>
          <small>AUTOMAÇÕES / POR MÓDULO</small>
          <h2>Regras de notificação</h2>
          <p>Defina exatamente quais partes do sistema avisam, por qual canal e com qual antecedência.</p>
        </div>
        <span className="adminChip ok">{rules.filter(rule=>rule.active).length} ativas</span>
      </div>

      <div className="notificationModuleGrid">
        {Array.from(new Set(rules.map(rule=>rule.module))).map(module=><article className="notificationModuleCard" key={module}>
          <header><small>MÓDULO</small><h3>{module}</h3></header>
          <div className="notificationRuleStack">
            {rules.filter(rule=>rule.module===module).map(rule=><form action={saveNotificationRule} className="notificationRuleCard" key={rule.id}>
              <input type="hidden" name="id" value={rule.id}/>
              <input type="hidden" name="module" value={rule.module}/>
              <input type="hidden" name="eventKey" value={rule.eventKey}/>
              <div className="notificationRuleHead">
                <div><small>{rule.eventKey}</small><input name="label" defaultValue={rule.label}/></div>
                <label className="notificationRuleToggle"><input name="active" type="checkbox" defaultChecked={rule.active}/><span>Ativa</span></label>
              </div>
              <div className="notificationChannelChecks">
                {["IN_APP","WHATSAPP","EMAIL","PUSH"].map(channel=><label key={channel}>
                  <input name="channels" type="checkbox" value={channel} defaultChecked={rule.channels.includes(channel)}/>
                  {channel}
                </label>)}
              </div>
              <div className="notificationRuleGrid">
                <label>Público<input name="audience" defaultValue={rule.audience}/></label>
                <label>Antecedência (min)<input name="advanceMinutes" type="number" min="0" max="525600" defaultValue={rule.advanceMinutes}/></label>
              </div>
              <label>Título<input name="templateTitle" defaultValue={rule.templateTitle||""}/></label>
              <label>Mensagem<textarea name="templateBody" rows={3} defaultValue={rule.templateBody||""}/></label>
              <div className="notificationRuleActions"><button>Salvar regra</button></div>
            </form>)}
          </div>
        </article>)}
      </div>

      <details className="notificationNewRule">
        <summary>+ Criar regra personalizada</summary>
        <form action={saveNotificationRule} className="adminFormGrid cols3">
          <label>Módulo<input name="module" required placeholder="Ex.: LOCACOES"/></label>
          <label>Evento<input name="eventKey" required placeholder="Ex.: DAMAGE_REPORTED"/></label>
          <label>Nome<input name="label" required placeholder="Ex.: Avaria registrada"/></label>
          <label>Público<input name="audience" defaultValue="INTERNAL"/></label>
          <label>Antecedência (min)<input name="advanceMinutes" type="number" min="0" defaultValue="0"/></label>
          <label className="notificationNewChannels">Canais
            <span>{["IN_APP","WHATSAPP","EMAIL","PUSH"].map(channel=><label key={channel}><input name="channels" type="checkbox" value={channel} defaultChecked={channel==="IN_APP"}/>{channel}</label>)}</span>
          </label>
          <label className="span2">Título<input name="templateTitle"/></label>
          <label className="span2">Mensagem<textarea name="templateBody" rows={3}/></label>
          <label className="notificationRuleToggle"><input name="active" type="checkbox" defaultChecked/><span>Ativa</span></label>
          <button className="span2">Criar regra</button>
        </form>
      </details>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Nova mensagem</h2>
        <p>Mensagens internas são registradas imediatamente. WhatsApp abre o envio assistido. E-mail pode ser disparado se o provider estiver configurado.</p>

        <form action={createNotification} className="adminFormGrid">
          <label>Canal
            <select name="channel" defaultValue="IN_APP">
              <option value="IN_APP">Interna</option>
              <option value="WHATSAPP">WhatsApp assistido</option>
              <option value="EMAIL">E-mail</option>
              <option value="PUSH">Push</option>
            </select>
          </label>
          <label>Público / segmento
            <input name="audience" defaultValue="INTERNAL" placeholder="Equipe, hóspedes, check-in..."/>
          </label>
          <label className="span2">Destinatário
            <input name="recipient" placeholder="Telefone, e-mail ou token. Vazio apenas para interna."/>
          </label>
          <label className="span2">Título
            <input name="title" required maxLength={180}/>
          </label>
          <label className="span2">Mensagem
            <textarea name="body" required rows={6} maxLength={4000}/>
          </label>
          <button className="span2">Adicionar à central</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>PROVIDERS / RUNTIME</small>
        <h2>Saúde dos canais</h2>
        <div className="adminStatusLine"><span>Notificação interna</span><b className="adminChip ok">PRONTA</b></div>
        <div className="adminStatusLine"><span>WhatsApp assistido</span><b className="adminChip ok">PRONTO</b></div>
        <div className="adminStatusLine"><span>E-mail / Resend</span><b className={"adminChip "+(emailReady?"ok":"warn")}>{emailReady?"PRONTO":"PENDENTE"}</b></div>
        <div className="adminStatusLine"><span>Firebase Web Push público</span><b className={"adminChip "+(pushPublicReady?"ok":"warn")}>{pushPublicReady?"CONFIGURADO":"PENDENTE"}</b></div>
        <div className="adminStatusLine"><span>Firebase server-side</span><b className={"adminChip "+(pushServerReady?"ok":"warn")}>{pushServerReady?"CONFIGURADO":"PENDENTE"}</b></div>

        <div className="adminPageNote" style={{marginTop:18}}>
          Push automático só deve ser habilitado quando houver credencial server-side e inscrições de dispositivos. A central não finge envio quando essas peças ainda não existem.
        </div>
      </aside>
    </section>

    <section className="adminSectionCard">
      <div className="adminListCardHead">
        <div>
          <small>OUTBOX / HISTÓRICO</small>
          <h2>Fila de mensagens</h2>
          <p>Últimas {messages.length} mensagens registradas.</p>
        </div>
      </div>

      {messages.length===0?<div className="adminEmptyState">
        <strong>Nenhuma mensagem registrada.</strong>
        <p>Use o formulário acima para criar a primeira notificação.</p>
      </div>:<div className="adminStack">
        {messages.map(message=>{
          const phone=message.channel==="WHATSAPP"
            ?message.recipient?.replace(/\D/g,"")
            :null;
          const wa=phone
            ?"https://wa.me/"+phone+"?text="+encodeURIComponent(message.title+"\n\n"+message.body)
            :null;

          return <article className="adminListCard" key={message.id}>
            <div className="adminListCardHead">
              <div>
                <small>{message.channel} • {message.audience}</small>
                <h3>{message.title}</h3>
                <p>{message.body}</p>
              </div>
              <span className={"adminChip "+statusClass(message.status)}>{message.status}</span>
            </div>

            <div className="adminMetaRow">
              {message.recipient&&<span className="adminChip">{message.recipient}</span>}
              <span className="adminChip">{message.createdAt.toLocaleString("pt-BR")}</span>
              {message.sentAt&&<span className="adminChip ok">Enviada {message.sentAt.toLocaleString("pt-BR")}</span>}
            </div>

            {message.error&&<div className="adminPageNote" style={{marginTop:12}}>{message.error}</div>}

            <div className="adminInlineActions">
              {message.channel==="EMAIL"&&message.status!=="SENT"&&message.status!=="CANCELLED"&&<form action={dispatchNotification}>
                <input type="hidden" name="id" value={message.id}/>
                <button className="highlight">Enviar e-mail</button>
              </form>}

              {message.channel==="WHATSAPP"&&message.status!=="SENT"&&message.status!=="CANCELLED"&&wa&&<>
                <a className="highlight" href={wa} target="_blank" rel="noreferrer">Abrir WhatsApp ↗</a>
                <form action={markNotificationSent}>
                  <input type="hidden" name="id" value={message.id}/>
                  <button>Marcar enviada</button>
                </form>
              </>}

              {message.status!=="SENT"&&message.status!=="CANCELLED"&&<form action={cancelNotification}>
                <input type="hidden" name="id" value={message.id}/>
                <button className="danger">Cancelar</button>
              </form>}
            </div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
