import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {updateSiteSection} from "../actions";
import SiteSectionForm from "../site-section-form";

export const dynamic="force-dynamic";

export default async function EditSiteSection({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;
  const [section,media]=await Promise.all([
    prisma.siteSection.findUnique({where:{id},include:{page:true}}),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:200})
  ]);
  if(!section)notFound();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / SITE BUILDER</small>
        <h1>Editar seção</h1>
        <p>{section.title||section.eyebrow||section.type} • alterações publicadas aparecem na Home após salvar.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site">← Editor do site</Link>
        <Link className="adminSecondaryAction" href="/" target="_blank">Preview ↗</Link>
      </div>
    </section>
    <SiteSectionForm action={updateSiteSection} pageId={section.pageId} media={media} section={section}/>
  </main>;
}
