import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {
  deleteSiteSection,
  duplicateSiteSection,
  moveSiteSection,
  saveSitePageMeta,
  toggleSiteSection
} from "./actions";
import MediaPicker from "../components/media-picker";

export const dynamic="force-dynamic";

const typeLabels:Record<string,string>={
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

export default async function SiteEditor(){
  await requireAdmin();

  const page=await prisma.sitePage.upsert({
    where:{slug:"home"},
    update:{},
    create:{
      id:"home",
      slug:"home",
      title:"Home",
      description:"Página inicial da Pousada Moriah"
    },
    include:{
      sections:{
        orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]
      }
    }
  });

  const media=await prisma.media.findMany({
    orderBy:{createdAt:"desc"},
    take:200
  });

  const active=page.sections.filter(section=>section.active).length;

  return <main className="adminPage siteBuilderPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE BUILDER</small>
        <h1>Conteúdo da Home</h1>
        <p>Edite os textos e imagens da página inicial bloco por bloco. Cada card abaixo corresponde a uma parte visível da Home.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site/paginas">Páginas →</Link>
        <Link className="adminSecondaryAction" href="/" target="_blank">Preview do site ↗</Link>
        <Link className="adminPrimaryAction" href="/admin/site/nova">+ Nova seção</Link>
      </div>
    </section>

    <section className="adminPageNote" style={{marginBottom:20}}>
      <b>Onde altero os textos da Home?</b> Role até <b>Seções</b> e clique em <b>Editar textos e visual</b> no bloco desejado. 
      Hero altera a abertura; Hospedagens altera o título da área de quartos; Estrutura, Galeria, Food, Blog, CTA e Texto editorial controlam o restante da página.
    </section>

    <section className="adminMetricStrip">
      <div><small>Seções</small><strong>{page.sections.length}</strong></div>
      <div><small>Publicadas</small><strong>{active}</strong></div>
      <div><small>Rascunho / off</small><strong>{page.sections.length-active}</strong></div>
      <div><small>Página</small><strong style={{fontSize:18}}>{page.published?"NO AR":"OCULTA"}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>SEO & página</h2>
        <p>Metadados da Home. Eles não alteram o conteúdo das seções.</p>
        <form action={saveSitePageMeta} className="adminFormGrid">
          <input type="hidden" name="id" value={page.id}/>
          <label className="span2">Nome interno
            <input name="title" required defaultValue={page.title}/>
          </label>
          <input type="hidden" name="slug" value="home"/>
          <input type="hidden" name="sortOrder" value={page.sortOrder}/>
          <label className="span2">Descrição interna
            <textarea name="description" rows={3} defaultValue={page.description||""}/>
          </label>
          <label className="span2">SEO title
            <input name="seoTitle" defaultValue={page.seoTitle||""} placeholder="Pousada Moriah em Praia Grande"/>
          </label>
          <label className="span2">SEO description
            <textarea name="seoDescription" rows={3} defaultValue={page.seoDescription||""}/>
          </label>
          <div className="span2">
            <MediaPicker name="ogImage" media={media} defaultValue={page.ogImage||""}/>
          </div>
          <label className="span2" style={{display:"flex",alignItems:"center",gap:8}}>
            <span><input name="published" type="checkbox" defaultChecked={page.published}/> Página publicada</span>
          </label>
          <button className="span2">Salvar página</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>COMO FUNCIONA</small>
        <h2>Blocos independentes</h2>
        <div className="adminStatusLine"><span>Hero</span><b>ABERTURA</b></div>
        <div className="adminStatusLine"><span>Hospedagens</span><b>DINÂMICO</b></div>
        <div className="adminStatusLine"><span>Galeria</span><b>MÍDIA</b></div>
        <div className="adminStatusLine"><span>Blog / Food</span><b>DINÂMICO</b></div>
        <div className="adminStatusLine"><span>Texto / CTA</span><b>EDITORIAL</b></div>
        <p style={{marginTop:20}}>Se não houver nenhuma seção ativa, a Home atual continua funcionando como fallback seguro.</p>
      </aside>
    </section>

    <section className="siteBuilderList">
      <div className="siteBuilderListHead">
        <div>
          <small>HOME / ORDEM DE PUBLICAÇÃO</small>
          <h2>Seções</h2>
        </div>
        <Link className="adminPrimaryAction" href="/admin/site/nova">+ Adicionar seção</Link>
      </div>

      {page.sections.length===0?<div className="adminEmptyState">
        <strong>A Home ainda usa o layout padrão.</strong>
        <p>Crie a primeira seção para ativar o Site Builder. O fallback atual permanece intacto até isso acontecer.</p>
        <Link className="adminPrimaryAction" href="/admin/site/nova">Criar primeira seção</Link>
      </div>:<div className="adminStack">
        {page.sections.map((section,index)=><article className="adminListCard siteBuilderSectionCard" key={section.id}>
          <div className="siteBuilderOrder">{String(index+1).padStart(2,"0")}</div>
          <div className="siteBuilderSectionMain">
            <div className="adminListCardHead">
              <div>
                <small>{typeLabels[section.type]||section.type} • {section.theme} • {section.layout} • {section.animation}</small>
                <h3>{section.title||section.eyebrow||"Seção sem título"}</h3>
                <p>{section.body?.slice(0,180)||"Sem texto adicional."}</p>
              </div>
              <span className={"adminChip "+(section.active?"ok":"warn")}>{section.active?"Publicada":"Oculta"}</span>
            </div>

            <div className="adminMetaRow">
              <span className="adminChip">Ordem {section.sortOrder}</span>
              {section.imageUrl&&<span className="adminChip">Imagem</span>}
              {section.mediaUrls.length>0&&<span className="adminChip">{section.mediaUrls.length} mídia(s)</span>}
              {section.ctaLabel&&<span className="adminChip">CTA</span>}
            </div>

            <div className="adminInlineActions">
              <Link className="highlight" href={"/admin/site/"+section.id}>Editar textos e visual</Link>
              <form action={moveSiteSection}>
                <input type="hidden" name="id" value={section.id}/>
                <input type="hidden" name="direction" value="UP"/>
                <button disabled={index===0}>↑ Subir</button>
              </form>
              <form action={moveSiteSection}>
                <input type="hidden" name="id" value={section.id}/>
                <input type="hidden" name="direction" value="DOWN"/>
                <button disabled={index===page.sections.length-1}>↓ Descer</button>
              </form>
              <form action={duplicateSiteSection}>
                <input type="hidden" name="id" value={section.id}/>
                <button>Duplicar</button>
              </form>
              <form action={toggleSiteSection}>
                <input type="hidden" name="id" value={section.id}/>
                <button>{section.active?"Ocultar":"Publicar"}</button>
              </form>
              <form action={deleteSiteSection}>
                <input type="hidden" name="id" value={section.id}/>
                <button className="danger">Excluir</button>
              </form>
            </div>
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
