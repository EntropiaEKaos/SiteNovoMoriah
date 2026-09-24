import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {deleteBlogPost} from "../actions";

export const dynamic="force-dynamic";

export default async function Page(){
  const posts=await prisma.blogPost.findMany({orderBy:{createdAt:"desc"}});
  const published=posts.filter(post=>post.published).length;
  const drafts=posts.length-published;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / CONTEÚDO</small>
        <h1>Blog / Journal</h1>
        <p>Gerencie matérias, notícias e conteúdo editorial publicado no site da Moriah.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/blog">Ver Journal ↗</Link>
        <Link className="adminPrimaryAction" href="/admin/blog/novo">+ Nova publicação</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Publicações</small><strong>{posts.length}</strong></div>
      <div><small>Publicadas</small><strong>{published}</strong></div>
      <div><small>Rascunhos</small><strong>{drafts}</strong></div>
      <div><small>Canal</small><strong style={{fontSize:18}}>JOURNAL</strong></div>
    </section>

    {posts.length===0?<section className="adminEmptyState">
      <strong>Nenhuma publicação criada.</strong>
      <p>Crie a primeira matéria para começar o Journal da Moriah.</p>
      <Link className="adminPrimaryAction" href="/admin/blog/novo">Criar publicação</Link>
    </section>:<section className="adminStack">
      {posts.map(post=><article className="adminListCard" key={post.id}>
        <div className="adminListCardHead">
          <div>
            <small>{post.published?"PUBLICADO":"RASCUNHO"}</small>
            <h3>{post.title}</h3>
            <p>{post.excerpt||"Sem resumo cadastrado."}</p>
          </div>
          <span className={"adminChip "+(post.published?"ok":"warn")}>{post.published?"No ar":"Rascunho"}</span>
        </div>

        <div className="adminMetaRow">
          <span className="adminChip">/blog/{post.slug}</span>
          <span className="adminChip">Atualizado {post.updatedAt.toLocaleDateString("pt-BR")}</span>
          {post.publishedAt&&<span className="adminChip">Publicado {post.publishedAt.toLocaleDateString("pt-BR")}</span>}
        </div>

        <div className="adminInlineActions">
          <Link className="highlight" href={"/admin/blog/"+post.id}>Editar</Link>
          {post.published&&<Link href={"/blog/"+post.slug}>Ver publicação ↗</Link>}
          <form action={deleteBlogPost}>
            <input type="hidden" name="id" value={post.id}/>
            <button className="danger">Excluir</button>
          </form>
        </div>
      </article>)}
    </section>}
  </main>;
}
