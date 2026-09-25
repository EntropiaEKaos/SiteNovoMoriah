import Link from "next/link";
import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import {getSiteLocale,localizeRecord} from "../../lib/site-i18n";
import PublicSiteChrome from "../public-site-chrome";

export const dynamic="force-dynamic";

export default async function Page(){
  const locale=await getSiteLocale();
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"
    ?{eyebrow:"MORIAH JOURNAL • PRAIA GRANDE",title:"Stories to make your stay even better.",body:"Local tips, Moriah news and useful content to enjoy Praia Grande with more ease.",posts:"POSTS",emptyTitle:"New stories coming soon.",emptyBody:"We are preparing content to help you enjoy your stay even more.",featured:"FEATURED",fallback:"Read the full story in the Moriah Journal.",read:"Read post →",continue:"Continue reading →"}
    :locale==="es"
      ?{eyebrow:"MORIAH JOURNAL • PRAIA GRANDE",title:"Historias para vivir mejor tu estancia.",body:"Consejos de la región, novedades de Moriah y contenido para disfrutar Praia Grande con más facilidad.",posts:"PUBLICACIONES",emptyTitle:"Nuevas historias muy pronto.",emptyBody:"Estamos preparando contenidos para ayudarte a aprovechar mejor tu estancia.",featured:"DESTACADO",fallback:"Lee la publicación completa en Moriah Journal.",read:"Leer publicación →",continue:"Seguir leyendo →"}
      :{eyebrow:"MORIAH JOURNAL • PRAIA GRANDE",title:"Histórias para viver melhor a sua estadia.",body:"Dicas da região, novidades da pousada e conteúdo para aproveitar Praia Grande com mais praticidade.",posts:"PUBLICAÇÕES",emptyTitle:"Novas histórias em breve.",emptyBody:"Estamos preparando conteúdos para ajudar você a aproveitar melhor sua estadia.",featured:"DESTAQUE",fallback:"Leia a publicação completa no Journal Moriah.",read:"Ler publicação →",continue:"Continuar lendo →"};

  const [posts,settings,navPages]=await Promise.all([
    prisma.blogPost.findMany({where:{published:true},orderBy:{publishedAt:"desc"}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true,translations:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const localizedPosts=posts.map(post=>localizeRecord(post,locale)!).filter(Boolean);
  const localizedSettings=localizeRecord(settings,locale);
  const localizedNavPages=navPages.map(row=>localizeRecord(row,locale)!).filter(Boolean);
  const [lead,...rest]=localizedPosts;

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <section className="siteSubpageHeroV6 journalHeroV6">
      <div>
        <small>{t.eyebrow}</small>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
      </div>
      <div className="siteSubpageHeroStats">
        <span><b>{localizedPosts.length}</b><small>{t.posts}</small></span>
        <span><b>MORIAH</b><small>JOURNAL</small></span>
      </div>
    </section>

    <section className="journalIndexV6">
      {localizedPosts.length===0?<div className="journalEmptyV6">
        <small>MORIAH JOURNAL</small>
        <h2>{t.emptyTitle}</h2>
        <p>{t.emptyBody}</p>
      </div>:<>
        {lead&&<article className="journalLeadCardV6">
          <Link className="journalLeadImageV6" href={"/blog/"+lead.slug}>
            {lead.coverImage?<img src={lead.coverImage} alt={lead.title}/>:<div className="journalImagePlaceholderV6">M</div>}
          </Link>
          <div>
            <small>{t.featured} • {lead.publishedAt?.toLocaleDateString(localeTag)||"MORIAH JOURNAL"}</small>
            <h2><Link href={"/blog/"+lead.slug}>{lead.title}</Link></h2>
            <p>{lead.excerpt||t.fallback}</p>
            <Link className="sitePrimaryCta" href={"/blog/"+lead.slug}>{t.read}</Link>
          </div>
        </article>}

        {rest.length>0&&<div className="journalGridV6">
          {rest.map(post=><article className="journalCardV6" key={post.id}>
            <Link className="journalCardImageV6" href={"/blog/"+post.slug}>
              {post.coverImage?<img src={post.coverImage} alt={post.title}/>:<div className="journalImagePlaceholderV6">M</div>}
            </Link>
            <div>
              <small>{post.publishedAt?.toLocaleDateString(localeTag)||"MORIAH JOURNAL"}</small>
              <h2><Link href={"/blog/"+post.slug}>{post.title}</Link></h2>
              <p>{post.excerpt||t.fallback}</p>
              <Link href={"/blog/"+post.slug}>{t.continue}</Link>
            </div>
          </article>)}
        </div>}
      </>}
    </section>
  </PublicSiteChrome>;
}
