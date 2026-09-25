import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import S3Upload from "./s3-upload";
import {addMedia,deleteMedia} from "../actions";
import {updateMediaMetadata} from "./actions";

export const dynamic="force-dynamic";

export default async function Page({
  searchParams
}:{
  searchParams:Promise<{q?:string;folder?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const q=String(params.q||"").trim();
  const folder=String(params.folder||"").trim();

  const where={
    ...(folder?{folder}:{}),
    ...(q?{
      OR:[
        {alt:{contains:q,mode:"insensitive" as const}},
        {label:{contains:q,mode:"insensitive" as const}},
        {folder:{contains:q,mode:"insensitive" as const}}
      ]
    }:{})
  };

  const [media,total,s3Count,folders]=await Promise.all([
    prisma.media.findMany({
      where,
      orderBy:[{sortOrder:"asc"},{createdAt:"desc"}],
      take:300
    }),
    prisma.media.count(),
    prisma.media.count({where:{provider:"S3"}}),
    prisma.media.findMany({
      where:{folder:{not:null}},
      distinct:["folder"],
      select:{folder:true},
      orderBy:{folder:"asc"}
    })
  ]);

  const totalBytes=media.reduce((sum,item)=>sum+(item.sizeBytes||0),0);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / MEDIA CENTER 2.0</small>
        <h1>Galeria</h1>
        <p>Upload em lote, pastas, metadados e organização do acervo usado pelo Site Builder, hospedagens, Blog e Moriah Food.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site">Editor do site →</Link>
        <Link className="adminSecondaryAction" href="/admin/midia">Biblioteca →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Total</small><strong>{total}</strong></div>
      <div><small>No S3</small><strong>{s3Count}</strong></div>
      <div><small>Exibidas</small><strong>{media.length}</strong></div>
      <div><small>Tamanho exibido</small><strong style={{fontSize:18}}>{(totalBytes/1024/1024).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:24}}>
      <article className="adminSectionCard">
        <h2>Upload em lote</h2>
        <p>Envie várias imagens de uma vez. O sistema otimiza fotos grandes e usa o caminho de upload mais seguro disponível.</p>
        <S3Upload/>
      </article>

      <article className="adminSectionCard">
        <h2>Adicionar por URL</h2>
        <p>Para imagens externas já hospedadas em origem confiável.</p>
        <form action={addMedia} className="adminFormGrid" data-feedback-success="Mídia adicionada com sucesso.">
          <label className="span2">URL
            <input name="url" required placeholder="https://..."/>
          </label>
          <label>Título interno
            <input name="label" placeholder="Ex.: Fachada noturna"/>
          </label>
          <label>Pasta
            <input name="folder" placeholder="Ex.: home / quartos / food"/>
          </label>
          <label className="span2">Texto alternativo
            <input name="alt" placeholder="Descrição acessível da imagem"/>
          </label>
          <button className="span2">Adicionar mídia</button>
        </form>
      </article>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <h2>Organizar acervo</h2>
      <form method="get" className="adminFormGrid cols3">
        <label>Busca
          <input name="q" defaultValue={q} placeholder="Título, ALT ou pasta"/>
        </label>
        <label>Pasta
          <select name="folder" defaultValue={folder}>
            <option value="">Todas</option>
            {folders.map(item=>item.folder&&<option key={item.folder} value={item.folder}>{item.folder}</option>)}
          </select>
        </label>
        <button>Aplicar</button>
        {(q||folder)&&<Link className="adminSecondaryAction" href="/admin/galeria">Limpar filtros</Link>}
      </form>
    </section>

    {media.length===0?<section className="adminEmptyState">
      <strong>Nenhuma mídia encontrada.</strong>
      <p>{q||folder?"Ajuste os filtros.":"Envie a primeira imagem pelo upload seguro acima."}</p>
    </section>:<section className="adminImageGrid mediaCenterGrid">
      {media.map(item=><article className="adminMediaCard mediaCenterCard" key={item.id}>
        <div className="mediaCenterPreview">
          <img src={item.url} alt={item.alt||""}/>
          <span className="adminChip">{item.provider}</span>
        </div>
        <div className="adminMediaCardBody">
          <b>{item.label||item.alt||"Imagem sem título"}</b>
          <small>{item.folder||"Sem pasta"}{item.sizeBytes?" • "+Math.round(item.sizeBytes/1024)+" KB":""}</small>

          <form action={updateMediaMetadata} className="mediaMetaForm" data-feedback-success="Metadados da mídia salvos.">
            <input type="hidden" name="id" value={item.id}/>
            <label>Título
              <input name="label" defaultValue={item.label||""}/>
            </label>
            <label>ALT
              <input name="alt" defaultValue={item.alt||""}/>
            </label>
            <label>Pasta
              <input name="folder" defaultValue={item.folder||""}/>
            </label>
            <label>Ordem
              <input name="sortOrder" type="number" defaultValue={item.sortOrder}/>
            </label>
            <button>Salvar metadados</button>
          </form>

          <div className="adminInlineActions">
            <a href={item.url} target="_blank" rel="noreferrer">Abrir ↗</a>
            <form action={deleteMedia} data-feedback-success="Mídia excluída com sucesso.">
              <input type="hidden" name="id" value={item.id}/>
              <button className="danger">Excluir</button>
            </form>
          </div>
        </div>
      </article>)}
    </section>}
  </main>;
}
