import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {updateBlogPost} from "../../actions";
import BlogEditor from "../blog-editor";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [post,media]=await Promise.all([
    prisma.blogPost.findUnique({where:{id}}),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:200})
  ]);
  if(!post)notFound();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / JOURNAL</small>
        <h1>Editar publicação</h1>
        <p>{post.title} • altere conteúdo, capa ou estado de publicação mantendo a URL editorial.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/blog">← Voltar ao Blog</Link>
        {post.published&&<Link className="adminSecondaryAction" href={"/blog/"+post.slug}>Ver no site ↗</Link>}
      </div>
    </section>
    <BlogEditor action={updateBlogPost} media={media} post={post}/>
  </main>;
}
