import Link from "next/link";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {
  importPhotographedMoriahMenu,
  photographedMoriahMenuSummary
} from "../../../../../lib/restaurant-menu-photo-import";

export const dynamic="force-dynamic";

export default async function ImportPhotographedMenuPage(){
  await requireAdmin();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / IMPORTAÇÃO SEGURA</small>
        <h1>Cardápio fotografado</h1>
        <p>Importação idempotente do cardápio físico recebido. Nenhuma migration e nenhum produto existente é sobrescrito.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante/cardapio">← Cardápio Studio</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Categorias</small><strong>{photographedMoriahMenuSummary.categories}</strong></div>
      <div><small>Produtos</small><strong>{photographedMoriahMenuSummary.products}</strong></div>
      <div><small>Grupos de escolha</small><strong>{photographedMoriahMenuSummary.modifierGroups}</strong></div>
      <div><small>Opções</small><strong>{photographedMoriahMenuSummary.modifierOptions}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <small>PROTEÇÕES</small>
        <h2>Importação sem quebrar o cardápio atual.</h2>
        <p>O importador procura categorias, grupos, opções e produtos existentes antes de criar qualquer registro. Produtos já existentes na mesma categoria são preservados sem alteração.</p>
        <div className="adminStatusLine"><span>Migration</span><b>NÃO</b></div>
        <div className="adminStatusLine"><span>SQL manual</span><b>NÃO</b></div>
        <div className="adminStatusLine"><span>Sobrescrever produto existente</span><b>NÃO</b></div>
        <div className="adminStatusLine"><span>Transação Prisma</span><b>SIM</b></div>
      </article>

      <article className="adminSectionCard isDark">
        <small>CONFIRMAÇÃO</small>
        <h2>Publicar lote no Moriah Food</h2>
        <p>Os novos itens serão publicados ativos. O controle unitário de estoque ficará desligado para que saldo zero não bloqueie a venda. A ficha técnica e estoque podem ser configurados depois no Cardápio Studio.</p>
        <form action={importPhotographedMoriahMenu}>
          <button className="adminPrimaryAction" style={{border:0,marginTop:18}}>
            Importar cardápio fotografado
          </button>
        </form>
      </article>
    </section>
  </main>;
}
