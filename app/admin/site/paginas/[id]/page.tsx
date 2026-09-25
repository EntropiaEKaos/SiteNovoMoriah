import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import MediaPicker from "../../../components/media-picker";
import {
  deleteSitePage,
  deleteSiteSection,
  duplicateSitePage,
  duplicateSiteSection,
  moveSiteSection,
  saveSitePageMeta,
  toggleSiteSection
} from "../../actions";

export const dynamic="force-dynamic";

const labels:Record<string,string>={
  HERO:"Hero",
  ACCOMMODATIONS:"Hospedagens",
  GALLERY:"Galeria",
  TRUST:"Confiança",
  FEATURES:"Estrutura",
  BLOG:"Blog",
  CTA:"CTA",
  RICH_TEXT:"Texto",
  FOOD:"Moriah Food",
  STATS:"Números",
  FAQ:"FAQ",
  TESTIMONIALS:"Depoimentos",
  CONTACT:"Contato",
  VIDEO:"Vídeo"
};

export default async function EditSitePage({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;

  const [page,media]=await Promise.all([
    prisma.sitePage.findUnique({
      where:{id},
      include:{sections:{orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}
    }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:250})
  ]);
  if(!page)notFound();
  if(page.slug==="home")redirect("/admin/site");

  const active=page.sections.filter(section=>section.active).length;

  return <main className="adminPage siteBuilderPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE STUDIO 5.0</small>
        <h1>{page.title}</h1>
        <p>/{page.slug} • {page.sections.length} seção(ões) • {active} publicada(s).</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site/paginas">← Páginas</Link>
        <Link className="adminSecondaryAction" href={"/"+page.slug} target="_blank">Preview ↗</Link>
        <Link className="adminPrimaryAction" href={"/admin/site/nova?pageId="+page.id}>+ Nova seção</Link>
      </div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Página, SEO & navegação</h2>
        <form action={saveSitePageMeta} className="adminFormGrid" data-feedback-success="Página salva com sucesso.">
          <input type="hidden" name="id" value={page.id}/>
          <label className="span2">Título interno
            <input name="title" required defaultValue={page.title}/>
          </label>
          <label>Slug
            <input name="slug" required defaultValue={page.slug}/>
          </label>
          <label>Nome no menu
            <input name="navLabel" defaultValue={page.navLabel||""}/>
          </label>
          <label>Ordem no menu
            <input name="sortOrder" type="number" min="0" max="9999" defaultValue={page.sortOrder}/>
          </label>
          <label style={{display:"flex",alignItems:"center",gap:8}}>
            <input name="showInNav" type="checkbox" defaultChecked={page.showInNav}/> Mostrar no menu
          </label>
          <label className="span2">Descrição interna
            <textarea name="description" rows={3} defaultValue={page.description||""}/>
          </label>
          <label className="span2">SEO title
            <input name="seoTitle" defaultValue={page.seoTitle||""}/>
          </label>
          <label className="span2">SEO description
            <textarea name="seoDescription" rows={3} defaultValue={page.seoDescription||""}/>
          </label>
          <div className="span2">
            <MediaPicker name="ogImage" media={media} defaultValue={page.ogImage||""}/>
          </div>
          <label className="span2" style={{display:"flex",gap:8,alignItems:"center"}}>
            <input name="published" type="checkbox" defaultChecked={page.published}/> Página publicada
          </label>
          <button className="span2">Salvar página</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>SITE STUDIO</small>
        <h2>Publicação</h2>
        <div className="adminStatusLine"><span>Status</span><b>{page.published?"NO AR":"RASCUNHO"}</b></div>
        <div className="adminStatusLine"><span>Seções</span><b>{page.sections.length}</b></div>
        <div className="adminStatusLine"><span>Ativas</span><b>{active}</b></div>
        <div className="adminStatusLine"><span>Navegação</span><b>{page.showInNav?"VISÍVEL":"OCULTA"}</b></div>
        <div className="adminInlineActions" style={{marginTop:18}}>
          <form action={duplicateSitePage}>
            <input type="hidden" name="id" value={page.id}/>
            <button>Duplicar página</button>
          </form>
          <form action={deleteSitePage}>
            <input type="hidden" name="id" value={page.id}/>
            <button className="danger">Excluir página</button>
          </form>
        </div>
      </aside>
    </section>

    <section className="siteBuilderList">
      <div className="siteBuilderListHead">
        <div><small>COMPOSIÇÃO</small><h2>Seções</h2></div>
        <Link className="adminPrimaryAction" href={"/admin/site/nova?pageId="+page.id}>+ Adicionar seção</Link>
      </div>

      {page.sections.length===0?<div className="adminEmptyState">
        <strong>Esta página ainda está vazia.</strong>
        <p>Adicione o primeiro bloco para começar a construir.</p>
      </div>:<div className="adminStack">
        {page.sections.map((section,index)=><article className="adminListCard siteBuilderSectionCard" key={section.id}>
          <div className="siteBuilderOrder">{String(index+1).padStart(2,"0")}</div>
          <div className="siteBuilderSectionMain">
            <div className="adminListCardHead">
              <div>
                <small>{labels[section.type]||section.type} • {section.layout} • {section.animation}</small>
                <h3>{section.title||section.eyebrow||"Seção sem título"}</h3>
                <p>{section.body?.slice(0,160)||"Sem conteúdo textual."}</p>
              </div>
              <span className={"adminChip "+(section.active?"ok":"warn")}>{section.active?"PUBLICADA":"OCULTA"}</span>
            </div>
            <div className="adminInlineActions">
              <Link className="highlight" href={"/admin/site/"+section.id}>Editar</Link>
              <form action={moveSiteSection}><input type="hidden" name="id" value={section.id}/><input type="hidden" name="direction" value="UP"/><button disabled={index===0}>↑</button></form>
              <form action={moveSiteSection}><input type="hidden" name="id" value={section.id}/><input type="hidden" name="direction" value="DOWN"/><button disabled={index===page.sections.length-1}>↓</button></form>
              <form action={duplicateSiteSection}><input type="hidden" name="id" value={section.id}/><button>Duplicar</button></form>
              <form action={toggleSiteSection}><input type="hidden" name="id" value={section.id}/><button>{section.active?"Ocultar":"Publicar"}</button></form>
              <form action={deleteSiteSection}><input type="hidden" name="id" value={section.id}/><button className="danger">Excluir</button></form>
            </div>
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
