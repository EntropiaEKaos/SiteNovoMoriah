import Link from "next/link";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {createSitePage} from "../../actions";

export const dynamic="force-dynamic";

export default async function NewSitePage(){
  await requireAdmin();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE STUDIO 5.0</small>
        <h1>Nova página</h1>
        <p>Crie a estrutura da página e depois adicione quantas seções forem necessárias.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site/paginas">← Páginas</Link>
      </div>
    </section>

    <section className="adminSectionCard">
      <form action={createSitePage} className="adminFormGrid">
        <label className="span2">Título interno
          <input name="title" required maxLength={180} placeholder="Ex.: Sobre a Moriah"/>
        </label>
        <label>Endereço / slug
          <input name="slug" maxLength={100} placeholder="sobre"/>
        </label>
        <label>Nome no menu
          <input name="navLabel" maxLength={80} placeholder="Sobre"/>
        </label>
        <label className="span2">Descrição interna
          <textarea name="description" rows={4} maxLength={1000}/>
        </label>
        <label style={{display:"flex",gap:8,alignItems:"center"}}>
          <input name="published" type="checkbox"/> Publicar imediatamente
        </label>
        <label style={{display:"flex",gap:8,alignItems:"center"}}>
          <input name="showInNav" type="checkbox"/> Mostrar na navegação
        </label>
        <button className="span2">Criar página e começar a editar</button>
      </form>
    </section>
  </main>;
}
