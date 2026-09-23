import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import PublicSubNav from "../../public-sub-nav";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const post=await prisma.blogPost.findUnique({where:{slug}});
  if(!post?.published)notFound();

  return <main className="publicSubpage">
    <PublicSubNav/>
    <article className="blogArticle">
      <Link className="blogArticleBack" href="/blog">← Voltar ao Journal</Link>
      {post.coverImage&&<img src={post.coverImage} alt={post.title}/>}
      <small>POUSADA MORIAH / JOURNAL</small>
      <h1>{post.title}</h1>
      {post.excerpt&&<p className="blogArticleLead">{post.excerpt}</p>}
      <div className="blogArticleContent">{post.content}</div>
    </article>
  </main>;
}
