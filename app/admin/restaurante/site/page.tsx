import Link from "next/link";
import {requireAdmin} from "../../../../lib/admin-auth";
import {ensureSpecialPage,restaurantVisualSeed} from "../../../../lib/special-site-pages";

export const dynamic="force-dynamic";

export default async function RestaurantSiteAdmin(){
  await requireAdmin();
  const page=await ensureSpecialPage(restaurantVisualSeed);
  const active=page.sections.filter(section=>section.active).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / SITE STANDALONE</small>
        <h1>Site do Restaurante</h1>
        <p>Edite a experiência visual do restaurante que pode rodar em subdomínio próprio, sem separar o motor de pedidos, estoque ou cozinha.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/restaurante-standalone" target="_blank">Preview ↗</Link>
        <Link className="adminPrimaryAction" href={"/admin/site/paginas/"+page.id}>Abrir Site Studio →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Seções</small><strong>{page.sections.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Motor</small><strong style={{fontSize:18}}>MORIAH FOOD</strong></div>
      <div><small>Modo</small><strong style={{fontSize:18}}>STANDALONE</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>O que você edita aqui</h2>
        <div className="adminStatusLine"><span>Hero, textos e chamadas</span><b>SITE STUDIO</b></div>
        <div className="adminStatusLine"><span>Imagens e fundos</span><b>GALERIA / S3</b></div>
        <div className="adminStatusLine"><span>Botões e links</span><b>EDITÁVEL</b></div>
        <div className="adminStatusLine"><span>Seções extras</span><b>ILIMITADAS</b></div>
      </article>

      <article className="adminSectionCard isDark">
        <small>MOTOR COMPARTILHADO</small>
        <h2>Um restaurante, uma operação.</h2>
        <p>Produtos, adicionais, preço, disponibilidade, estoque, ficha técnica, KDS, pedidos e inteligência continuam vindo do mesmo motor. O subdomínio muda somente a experiência pública.</p>
        <div className="adminInlineActions">
          <Link href="/admin/restaurante/cardapio">Cardápio Studio →</Link>
          <Link href="/admin/restaurante/pedidos">KDS →</Link>
          <Link href="/admin/restaurante/insumos">Estoque / CMV →</Link>
        </div>
      </article>
    </section>

    <section className="adminPageNote" style={{marginTop:20}}>
      <b>Subdomínio:</b> depois do deploy, a Vercel pode apontar algo como <b>restaurante.seudominio.com.br</b> para este mesmo projeto. O middleware detecta o host e entrega a experiência standalone sem duplicar backend.
    </section>
  </main>;
}
