import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import PublicSiteChrome from "../../public-site-chrome";
import BlogContent from "../blog-content";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const post=await prisma.blogPost.findUnique({
    where:{slug},
    select:{title:true,excerpt:true,coverImage:true,published:true}
  });
  if(!post?.published)return {};
  return {
    title:post.title+" | Moriah Journal",
    description:post.excerpt||"Conteúdo do Moriah Journal.",
    openGraph:post.coverImage?{images:[post.coverImage]}:undefined
  };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const [post,settings,navPages]=await Promise.all([
    prisma.blogPost.findUnique({where:{slug}}),
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);
  if(!post?.published)notFound();

  const wordCount=post.content.trim()?post.content.trim().split(/\s+/).length:0;
  const readingMinutes=Math.max(1,Math.ceil(wordCount/200));

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    <article className="blogArticleV6">
      <div className="blogArticleTopV6">
        <Link href="/blog">← Voltar ao Moriah Journal</Link>
        <div className="blogArticleMetaV6">
          <span>{post.publishedAt?.toLocaleDateString("pt-BR")||"Moriah Journal"}</span>
          <span>{readingMinutes} min de leitura</span>
        </div>
        <h1>{post.title}</h1>
        {post.excerpt&&<p className="blogArticleLeadV6">{post.excerpt}</p>}
      </div>

      {post.coverImage&&<figure className="blogArticleCoverV6"><img src={post.coverImage} alt={post.title}/></figure>}

      <div className="blogArticleBodyV6">
        <BlogContent content={post.content}/>
      </div>

      <footer className="blogArticleFooterV6">
        <div><small>MORIAH JOURNAL</small><b>Continue descobrindo Praia Grande com a Moriah.</b></div>
        <Link className="sitePrimaryCta" href="/reservar">Ver disponibilidade →</Link>
      </footer>
    </article>
  </PublicSiteChrome>;
}
