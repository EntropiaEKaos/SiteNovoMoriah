import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import {loadPublicSiteSettings} from "../../../lib/public-site-settings";
import {getSiteLocale,localizeRecord} from "../../../lib/site-i18n";
import PublicSiteChrome from "../../public-site-chrome";
import BlogContent from "../blog-content";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const locale=await getSiteLocale();
  const post=await prisma.blogPost.findUnique({where:{slug}});
  if(!post?.published)return {};
  const localized=localizeRecord(post,locale)||post;
  return {
    title:localized.title+" | Moriah Journal",
    description:localized.excerpt||(locale==="en"?"Moriah Journal article.":locale==="es"?"Contenido de Moriah Journal.":"Conteúdo do Moriah Journal."),
    openGraph:localized.coverImage?{images:[localized.coverImage]}:undefined
  };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const locale=await getSiteLocale();
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"
    ?{back:"← Back to Moriah Journal",reading:"min read",footer:"Keep discovering Praia Grande with Moriah.",availability:"Check availability →"}
    :locale==="es"
      ?{back:"← Volver a Moriah Journal",reading:"min de lectura",footer:"Sigue descubriendo Praia Grande con Moriah.",availability:"Ver disponibilidad →"}
      :{back:"← Voltar ao Moriah Journal",reading:"min de leitura",footer:"Continue descobrindo Praia Grande com a Moriah.",availability:"Ver disponibilidade →"};

  const [post,settings,navPages]=await Promise.all([
    prisma.blogPost.findUnique({where:{slug}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);
  if(!post?.published)notFound();

  const localized=localizeRecord(post,locale)||post;
  const localizedSettings=localizeRecord(settings,locale);
  const localizedNavPages=navPages.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const wordCount=localized.content.trim()?localized.content.trim().split(/\s+/).length:0;
  const readingMinutes=Math.max(1,Math.ceil(wordCount/200));

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <article className="blogArticleV6">
      <div className="blogArticleTopV6">
        <Link href="/blog">{t.back}</Link>
        <div className="blogArticleMetaV6">
          <span>{localized.publishedAt?.toLocaleDateString(localeTag)||"Moriah Journal"}</span>
          <span>{readingMinutes} {t.reading}</span>
        </div>
        <h1>{localized.title}</h1>
        {localized.excerpt&&<p className="blogArticleLeadV6">{localized.excerpt}</p>}
      </div>

      {localized.coverImage&&<figure className="blogArticleCoverV6"><img src={localized.coverImage} alt={localized.title}/></figure>}

      <div className="blogArticleBodyV6">
        <BlogContent content={localized.content}/>
      </div>

      <footer className="blogArticleFooterV6">
        <div><small>MORIAH JOURNAL</small><b>{t.footer}</b></div>
        <Link className="sitePrimaryCta" href="/reservar">{t.availability}</Link>
      </footer>
    </article>
  </PublicSiteChrome>;
}
