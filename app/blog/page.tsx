import Link from "next/link";
import {prisma} from "../../lib/prisma";
import PublicSubNav from "../public-sub-nav";

export const dynamic="force-dynamic";

export default async function Page(){
  const posts=await prisma.blogPost.findMany({
    where:{published:true},
    orderBy:{publishedAt:"desc"}
  });

  return <main className="publicSubpage">
    <PublicSubNav/>
    <section className="publicHero">
      <small>MORIAH JOURNAL • PRAIA GRANDE</small>
      <h1>Histórias, dicas<br/>e novidades<span style={{color:"#ffd400"}}>.</span></h1>
      <p>Conteúdo para aproveitar melhor a estadia, descobrir a região e acompanhar as novidades da Pousada Moriah.</p>
      <div className="publicHeroMeta">
        <span>{posts.length} PUBLICAÇÃO(ÕES)</span>
        <span>PRAIA GRANDE • SP</span>
      </div>
    </section>

    <section className="blogIndex">
      {posts.length===0?<div className="blogEmpty">
        <h2>Novas histórias em breve.</h2>
        <p>O blog da Moriah está sendo preparado.</p>
      </div>:<div className="blogGrid">
        {posts.map((p,index)=><article className="blogCard" key={p.id}>
          {p.coverImage&&<img src={p.coverImage} alt={p.title}/>}
          <div className="blogCardBody">
            <small>{String(index+1).padStart(2,"0")} • MORIAH JOURNAL</small>
            <h2>{p.title}</h2>
            <p>{p.excerpt||"Leia a publicação completa no Journal Moriah."}</p>
            <Link href={"/blog/"+p.slug}>Ler publicação →</Link>
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
