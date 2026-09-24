import Link from "next/link";
import {createBlogPost} from "../../actions";
import {prisma} from "../../../../lib/prisma";
import BlogEditor from "../blog-editor";

export const dynamic="force-dynamic";

export default async function Page(){
  const media=await prisma.media.findMany({orderBy:{createdAt:"desc"},take:200});
  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / JOURNAL</small>
        <h1>Nova publicação</h1>
        <p>Crie uma matéria completa com capa, resumo, URL e conteúdo editorial.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/blog">← Voltar ao Blog</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Gerenciar imagens →</Link>
      </div>
    </section>
    <BlogEditor action={createBlogPost} media={media}/>
  </main>;
}
