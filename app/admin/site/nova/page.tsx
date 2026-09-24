import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {createSiteSection} from "../actions";
import SiteSectionForm from "../site-section-form";

export const dynamic="force-dynamic";

export default async function NewSiteSection({
  searchParams
}:{
  searchParams:Promise<{pageId?:string}>
}){
  const params=await searchParams;
  await requireAdmin();
  const [page,media]=await Promise.all([
    params.pageId
      ?prisma.sitePage.findUnique({where:{id:params.pageId}})
      :prisma.sitePage.upsert({
          where:{slug:"home"},
          update:{},
          create:{id:"home",slug:"home",title:"Home",description:"Página inicial da Pousada Moriah"}
        }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:200})
  ]);
  if(!page)throw new Error("Página não encontrada.");

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE BUILDER</small>
        <h1>Nova seção</h1>
        <p>Crie um novo bloco para <b>{page.title}</b> e configure conteúdo, mídia, movimento, responsividade e ações.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href={page.slug==="home"?"/admin/site":"/admin/site/paginas/"+page.id}>← Voltar à página</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Gerenciar mídia →</Link>
      </div>
    </section>
    <SiteSectionForm action={createSiteSection} pageId={page.id} media={media}/>
  </main>;
}
