import Link from "next/link";
import {prisma} from "../../lib/prisma";
import {loadPublicSiteSettings} from "../../lib/public-site-settings";
import PublicSiteChrome from "../public-site-chrome";

export const dynamic="force-dynamic";

export default async function Page(){
  const [posts,settings,navPages]=await Promise.all([
    prisma.blogPost.findMany({
      where:{published:true},
      orderBy:{publishedAt:"desc"}
    }),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({
      where:{published:true,showInNav:true,slug:{not:"home"}},
      select:{slug:true,title:true,navLabel:true},
      orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
      take:6
    })
  ]);

  const [lead,...rest]=posts;

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    <section className="siteSubpageHeroV6 journalHeroV6">
      <div>
        <small>MORIAH JOURNAL • PRAIA GRANDE</small>
        <h1>Histórias para viver<br/>melhor a sua estadia.</h1>
        <p>Dicas da região, novidades da pousada e conteúdo para aproveitar Praia Grande com mais praticidade.</p>
      </div>
      <div className="siteSubpageHeroStats">
        <span><b>{posts.length}</b><small>PUBLICAÇÕES</small></span>
        <span><b>MORIAH</b><small>JOURNAL</small></span>
      </div>
    </section>

    <section className="journalIndexV6">
      {posts.length===0?<div className="journalEmptyV6">
        <small>MORIAH JOURNAL</small>
        <h2>Novas histórias em breve.</h2>
        <p>Estamos preparando conteúdos para ajudar você a aproveitar melhor sua estadia.</p>
      </div>:<>
        {lead&&<article className="journalLeadCardV6">
          <Link className="journalLeadImageV6" href={"/blog/"+lead.slug}>
            {lead.coverImage?<img src={lead.coverImage} alt={lead.title}/>:<div className="journalImagePlaceholderV6">M</div>}
          </Link>
          <div>
            <small>DESTAQUE • {lead.publishedAt?.toLocaleDateString("pt-BR")||"MORIAH JOURNAL"}</small>
            <h2><Link href={"/blog/"+lead.slug}>{lead.title}</Link></h2>
            <p>{lead.excerpt||"Leia a publicação completa no Journal Moriah."}</p>
            <Link className="sitePrimaryCta" href={"/blog/"+lead.slug}>Ler publicação →</Link>
          </div>
        </article>}

        {rest.length>0&&<div className="journalGridV6">
          {rest.map(post=><article className="journalCardV6" key={post.id}>
            <Link className="journalCardImageV6" href={"/blog/"+post.slug}>
              {post.coverImage?<img src={post.coverImage} alt={post.title}/>:<div className="journalImagePlaceholderV6">M</div>}
            </Link>
            <div>
              <small>{post.publishedAt?.toLocaleDateString("pt-BR")||"MORIAH JOURNAL"}</small>
              <h2><Link href={"/blog/"+post.slug}>{post.title}</Link></h2>
              <p>{post.excerpt||"Leia a publicação completa no Journal Moriah."}</p>
              <Link href={"/blog/"+post.slug}>Continuar lendo →</Link>
            </div>
          </article>)}
        </div>}
      </>}
    </section>
  </PublicSiteChrome>;
}
