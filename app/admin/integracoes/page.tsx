import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {saveFirebaseSettings,saveChatSettings} from "../actions";

export const dynamic="force-dynamic";

const env=(name:string)=>Boolean(process.env[name]?.trim());

export default async function Page(){
  await requireAdmin();

  const cfg=await prisma.integrationSettings.findUnique({where:{id:"main"}});

  const firebase=[
    cfg?.firebaseApiKey,
    cfg?.firebaseAuthDomain,
    cfg?.firebaseProjectId,
    cfg?.firebaseStorageBucket,
    cfg?.firebaseMessagingSenderId,
    cfg?.firebaseAppId
  ].every(Boolean);

  const groq=env("GROQ_API_KEY");
  const s3=env("AWS_ACCESS_KEY_ID")&&env("AWS_SECRET_ACCESS_KEY")&&env("AWS_S3_BUCKET");

  const infra=[
    ["Banco de dados",env("DATABASE_URL"),"DATABASE_URL"],
    ["Sessão do Admin",env("SESSION_SECRET"),"SESSION_SECRET"],
    ["Cron de canais",env("CRON_SECRET"),"CRON_SECRET"],
    ["Groq API",groq,"GROQ_API_KEY"],
    ["AWS S3",s3,"AWS_*"],
    ["CloudFront",env("AWS_CLOUDFRONT_URL"),"AWS_CLOUDFRONT_URL"]
  ] as const;

  const configured=infra.filter(([,ok])=>ok).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / CENTRAL DE SERVIÇOS</small>
        <h1>Integrações</h1>
        <p>Configure serviços públicos pelo painel e acompanhe a saúde da infraestrutura sem expor credenciais sensíveis.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/canais">Canais →</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Mídia / S3 →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Infra configurada</small><strong>{configured}/{infra.length}</strong></div>
      <div><small>Groq API</small><strong style={{fontSize:18}}>{groq?"PRONTA":"PENDENTE"}</strong></div>
      <div><small>Firebase</small><strong style={{fontSize:18}}>{firebase?"PRONTO":"PENDENTE"}</strong></div>
      <div><small>S3</small><strong style={{fontSize:18}}>{s3?"PRONTO":"PENDENTE"}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard isDark">
        <small>INFRAESTRUTURA / PRODUÇÃO</small>
        <h2>Diagnóstico</h2>
        <p>O painel mostra apenas se cada variável está configurada. Nenhum segredo é exibido.</p>
        <div className="adminStack">
          {infra.map(([name,ok,key])=><div className="adminStatusLine" key={name}>
            <span>{name}<br/><small>{key}</small></span>
            <b className={"adminChip "+(ok?"ok":"warn")}>{ok?"CONFIGURADO":"PENDENTE"}</b>
          </div>)}
        </div>
        <div className="adminPageNote" style={{marginTop:20}}>
          DATABASE_URL, SESSION_SECRET, GROQ_API_KEY e credenciais AWS permanecem exclusivamente nas variáveis de ambiente da Vercel.
        </div>
      </article>

      <article className="adminSectionCard">
        <small>ATENDIMENTO IA</small>
        <h2>Groq Chat</h2>
        <p>Personalize o comportamento do assistente. A chave da API não é armazenada no banco nem exibida no navegador.</p>

        <div className="adminMetaRow" style={{marginBottom:18}}>
          <span className={"adminChip "+(cfg?.chatEnabled!==false?"ok":"warn")}>{cfg?.chatEnabled!==false?"Atendimento ativo":"Atendimento desligado"}</span>
          <span className={"adminChip "+(groq?"ok":"bad")}>{groq?"API Groq configurada":"GROQ_API_KEY ausente"}</span>
        </div>

        <form action={saveChatSettings} className="adminFormGrid">
          <label className="span2" style={{display:"flex",gridTemplateColumns:"auto 1fr",alignItems:"center"}}>
            <span><input type="checkbox" name="chatEnabled" defaultChecked={cfg?.chatEnabled!==false}/> Atendimento ativo</span>
          </label>
          <label>Nome do assistente
            <input name="chatName" defaultValue={cfg?.chatName||"Moriah Assistente"}/>
          </label>
          <label>Modelo Groq
            <select name="groqModel" defaultValue={
              cfg?.groqModel==="llama-3.1-8b-instant"
                ?"openai/gpt-oss-20b"
                :cfg?.groqModel==="llama-3.3-70b-versatile"
                  ?"openai/gpt-oss-120b"
                  :(cfg?.groqModel||"openai/gpt-oss-20b")
            }>
              <option value="openai/gpt-oss-20b">GPT-OSS 20B — rápido / recomendado</option>
              <option value="openai/gpt-oss-120b">GPT-OSS 120B — respostas mais robustas</option>
            </select>
          </label>
          <label>Temperatura
            <input name="groqTemperature" type="number" min="0" max="1" step="0.1" defaultValue={cfg?.groqTemperature??0.2}/>
          </label>
          <label className="span2">Mensagem inicial
            <textarea name="chatWelcome" rows={3} defaultValue={cfg?.chatWelcome||"Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?"}/>
          </label>
          <label className="span2">Instruções comerciais adicionais
            <textarea name="chatInstructions" rows={5} defaultValue={cfg?.chatInstructions||""} placeholder="Ex.: atendimento acolhedor, destacar promoções cadastradas e nunca inventar disponibilidade."/>
          </label>
          <button className="span2">Salvar atendimento IA</button>
        </form>
      </article>
    </section>

    <section className="adminSectionCard">
      <div className="adminListCardHead">
        <div>
          <small>CONFIGURAÇÃO PÚBLICA</small>
          <h2>Firebase</h2>
          <p>Identificadores públicos usados no navegador. Credenciais administrativas do Firebase continuam fora do CMS.</p>
        </div>
        <span className={"adminChip "+(firebase?"ok":"warn")}>{firebase?"Configurado":"Pendente"}</span>
      </div>

      <form action={saveFirebaseSettings} className="adminFormGrid cols3" style={{marginTop:20}}>
        <label>API key<input name="firebaseApiKey" defaultValue={cfg?.firebaseApiKey||""}/></label>
        <label>Auth domain<input name="firebaseAuthDomain" defaultValue={cfg?.firebaseAuthDomain||""}/></label>
        <label>Project ID<input name="firebaseProjectId" defaultValue={cfg?.firebaseProjectId||""}/></label>
        <label>Storage bucket<input name="firebaseStorageBucket" defaultValue={cfg?.firebaseStorageBucket||""}/></label>
        <label>Messaging sender ID<input name="firebaseMessagingSenderId" defaultValue={cfg?.firebaseMessagingSenderId||""}/></label>
        <label>App ID<input name="firebaseAppId" defaultValue={cfg?.firebaseAppId||""}/></label>
        <label className="span2">VAPID key<input name="firebaseVapidKey" defaultValue={cfg?.firebaseVapidKey||""}/></label>
        <button>Salvar Firebase</button>
      </form>
    </section>
  </main>;
}
