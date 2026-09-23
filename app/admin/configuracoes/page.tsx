import {prisma} from "../../../lib/prisma";
import {saveSettings} from "../actions";

export const dynamic="force-dynamic";

export default async function Page(){
  const settings=await prisma.siteSettings.findUnique({where:{id:"main"}});

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / IDENTIDADE</small>
        <h1>Configurações</h1>
        <p>Dados institucionais usados pelo site, pelo atendimento e pelos fluxos públicos da Moriah.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/">Ver site ↗</a>
      </div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Identidade pública</h2>
        <p>Essas informações aparecem em diferentes pontos do site e alimentam também o contexto do assistente.</p>
        <form action={saveSettings} className="adminFormGrid">
          <label className="span2">Nome do site
            <input name="siteName" defaultValue={settings?.siteName||"Pousada Moriah"}/>
          </label>
          <label className="span2">Slogan
            <input name="tagline" defaultValue={settings?.tagline||"Seu lugar perto de tudo. Do seu jeito."}/>
          </label>
          <label>WhatsApp
            <input name="whatsapp" defaultValue={settings?.whatsapp||""} placeholder="Ex.: 5513999999999"/>
          </label>
          <label>Instagram
            <input name="instagram" defaultValue={settings?.instagram||""} placeholder="@pousadamoriah"/>
          </label>
          <label className="span2">Endereço
            <input name="address" defaultValue={settings?.address||""}/>
          </label>
          <button className="span2">Salvar alterações</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>PUBLICAÇÃO</small>
        <h2>O que esta tela alimenta?</h2>
        <div className="adminStatusLine"><span>Site público</span><b>CMS</b></div>
        <div className="adminStatusLine"><span>WhatsApp / contato</span><b>CMS</b></div>
        <div className="adminStatusLine"><span>Assistente Moriah</span><b>CONTEXTO</b></div>
        <div className="adminStatusLine"><span>Endereço institucional</span><b>CMS</b></div>
        <p style={{marginTop:20}}>Credenciais e segredos continuam fora daqui, protegidos nas variáveis de ambiente da Vercel.</p>
      </aside>
    </section>
  </main>;
}
