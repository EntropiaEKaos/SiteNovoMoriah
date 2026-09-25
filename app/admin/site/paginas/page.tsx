import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {duplicateSitePage} from "../actions";

export const dynamic="force-dynamic";

export default async function SitePages(){
  await requireAdmin();

  const pages=await prisma.sitePage.findMany({
    include:{_count:{select:{sections:true}}},
    orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]
  });

  const published=pages.filter(page=>page.published).length;
  const inNav=pages.filter(page=>page.showInNav&&page.published).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE STUDIO 5.0</small>
        <h1>Páginas do site</h1>
        <p>Crie páginas completas, controle SEO, navegação, publicação e componha cada uma com blocos visuais.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site">Editar Home</Link>
        <Link className="adminPrimaryAction" href="/admin/site/paginas/nova">+ Nova página</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Páginas</small><strong>{pages.length}</strong></div>
      <div><small>Publicadas</small><strong>{published}</strong></div>
      <div><small>No menu</small><strong>{inNav}</strong></div>
      <div><small>Rascunhos</small><strong>{pages.length-published}</strong></div>
    </section>

    <section className="adminStack">
      {pages.map(page=><article className="adminListCard" key={page.id}>
        <div className="adminListCardHead">
          <div>
            <small>{page.slug==="home"?"PÁGINA INICIAL":"/"+page.slug}</small>
            <h3>{page.title}</h3>
            <p>{page.description||"Sem descrição interna."}</p>
          </div>
          <div className="adminMetaRow">
            <span className={"adminChip "+(page.published?"ok":"warn")}>{page.published?"PUBLICADA":"RASCUNHO"}</span>
            {page.showInNav&&<span className="adminChip">MENU</span>}
          </div>
        </div>
        <div className="adminMetaRow">
          <span className="adminChip">{page._count.sections} seção(ões)</span>
          <span className="adminChip">Ordem {page.sortOrder}</span>
          {page.seoTitle&&<span className="adminChip ok">SEO</span>}
        </div>
        <div className="adminInlineActions">
          <Link className="highlight" href={page.slug==="home"?"/admin/site":"/admin/site/paginas/"+page.id}>Editar</Link>
          <Link href={page.slug==="home"?"/":"/"+page.slug} target="_blank">Abrir ↗</Link>
          <form action={duplicateSitePage} data-feedback-success="Página duplicada com sucesso.">
            <input type="hidden" name="id" value={page.id}/>
            <button>Duplicar página</button>
          </form>
        </div>
      </article>)}
    </section>
  </main>;
}
