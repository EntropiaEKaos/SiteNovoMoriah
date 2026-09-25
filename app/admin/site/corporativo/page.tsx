import Link from "next/link";
import {requireAdmin} from "../../../../lib/admin-auth";
import {corporateSeed,ensureSpecialPage} from "../../../../lib/special-site-pages";

export const dynamic="force-dynamic";

export default async function CorporateAdmin(){
  await requireAdmin();
  const page=await ensureSpecialPage(corporateSeed);
  const active=page.sections.filter(section=>section.active).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / INSTITUCIONAL</small>
        <h1>Moriah Corporativo</h1>
        <p>Página comercial para café da manhã em obras e equipes, importada como estrutura editável no Site Studio.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/corporativo" target="_blank">Ver página ↗</Link>
        <Link className="adminPrimaryAction" href={"/admin/site/paginas/"+page.id}>Editar no Site Studio →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Seções</small><strong>{page.sections.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Destino</small><strong style={{fontSize:18}}>/corporativo</strong></div>
      <div><small>Status</small><strong style={{fontSize:18}}>{page.published?"NO AR":"RASCUNHO"}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Conteúdo inicial</h2>
        <div className="adminStatusLine"><span>Oferta principal</span><b>Café na obra</b></div>
        <div className="adminStatusLine"><span>Processo</span><b>4 ETAPAS</b></div>
        <div className="adminStatusLine"><span>Benefícios</span><b>6 BLOCOS</b></div>
        <div className="adminStatusLine"><span>Preço de referência</span><b>R$ 11,80 / pessoa</b></div>
        <div className="adminStatusLine"><span>CTA</span><b>WHATSAPP</b></div>
      </article>

      <article className="adminSectionCard isDark">
        <small>100% EDITÁVEL</small>
        <h2>Você não fica preso ao layout inicial.</h2>
        <p>No Site Studio você pode trocar títulos, textos, preço, imagens, cores, animações, botões e até adicionar novas seções sem alterar o código.</p>
        <Link className="adminPrimaryAction" href={"/admin/site/paginas/"+page.id}>Abrir editor →</Link>
      </article>
    </section>
  </main>;
}
