import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {createSiteSection} from "../actions";
import SiteSectionForm from "../site-section-form";

export const dynamic="force-dynamic";

export default async function NewSiteSection(){
  await requireAdmin();
  const [page,media]=await Promise.all([
    prisma.sitePage.upsert({
      where:{slug:"home"},
      update:{},
      create:{id:"home",slug:"home",title:"Home",description:"Página inicial da Pousada Moriah"}
    }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:200})
  ]);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE BUILDER</small>
        <h1>Nova seção</h1>
        <p>Crie um novo bloco para a Home e configure conteúdo, mídia, layout e ações.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site">← Editor do site</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Gerenciar mídia →</Link>
      </div>
    </section>
    <SiteSectionForm action={createSiteSection} pageId={page.id} media={media}/>
  </main>;
}
