import {prisma} from "../../../lib/prisma";
import S3Upload from "./s3-upload";
import {addMedia,deleteMedia} from "../actions";

export const dynamic="force-dynamic";

export default async function Page(){
  const media=await prisma.media.findMany({orderBy:{createdAt:"desc"}});

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / MÍDIA</small>
        <h1>Galeria</h1>
        <p>Gerencie imagens públicas e o acervo usado nas páginas de hospedagem, blog e comunicação visual da Moriah.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/">Ver site ↗</a>
        <a className="adminSecondaryAction" href="/admin/midia">Biblioteca →</a>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Imagens</small><strong>{media.length}</strong></div>
      <div><small>S3 / CDN</small><strong style={{fontSize:18}}>ATIVO</strong></div>
      <div><small>Upload máximo</small><strong style={{fontSize:18}}>10 MB</strong></div>
      <div><small>Formatos</small><strong style={{fontSize:18}}>JPG · PNG · WEBP</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:24}}>
      <article className="adminSectionCard">
        <h2>Upload seguro</h2>
        <p>Envie imagens diretamente para o armazenamento configurado. O arquivo é validado antes de entrar na biblioteca.</p>
        <S3Upload/>
      </article>

      <article className="adminSectionCard">
        <h2>Adicionar por URL</h2>
        <p>Use apenas quando a imagem já estiver hospedada em uma origem confiável.</p>
        <form action={addMedia} className="adminFormGrid">
          <label className="span2">URL da imagem
            <input name="url" required placeholder="https://..."/>
          </label>
          <label className="span2">Texto alternativo
            <input name="alt" placeholder="Descrição da imagem"/>
          </label>
          <button className="span2">Adicionar mídia</button>
        </form>
      </article>
    </section>

    {media.length===0?<section className="adminEmptyState">
      <strong>Nenhuma mídia registrada.</strong>
      <p>Envie a primeira imagem pelo upload seguro acima.</p>
    </section>:<section className="adminImageGrid">
      {media.map(item=><article className="adminMediaCard" key={item.id}>
        <img src={item.url} alt={item.alt||""}/>
        <div className="adminMediaCardBody">
          <b>{item.alt||"Imagem sem descrição"}</b>
          <small>{item.provider}{item.sizeBytes?" • "+Math.round(item.sizeBytes/1024)+" KB":""}</small>
          <form action={deleteMedia}>
            <input type="hidden" name="id" value={item.id}/>
            <button className="danger">Excluir</button>
          </form>
        </div>
      </article>)}
    </section>}
  </main>;
}
