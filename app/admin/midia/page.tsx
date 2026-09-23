import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();
  const rows=await prisma.media.findMany({orderBy:{createdAt:"desc"},take:100});
  const s3=rows.filter(row=>row.provider==="S3").length;
  const totalBytes=rows.reduce((sum,row)=>sum+(row.sizeBytes||0),0);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / BIBLIOTECA</small>
        <h1>Mídia</h1>
        <p>Biblioteca central dos arquivos registrados no site. Os uploads novos entram pelo fluxo protegido da Galeria e dos formulários do CMS.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminPrimaryAction" href="/admin/galeria">Abrir Galeria</a>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Arquivos</small><strong>{rows.length}</strong></div>
      <div><small>No S3</small><strong>{s3}</strong></div>
      <div><small>Tamanho visível</small><strong style={{fontSize:20}}>{(totalBytes/1024/1024).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB</strong></div>
      <div><small>Limite listado</small><strong>100</strong></div>
    </section>

    {rows.length===0?<section className="adminEmptyState">
      <strong>Nenhuma mídia registrada.</strong>
      <p>Envie a primeira imagem pela Galeria.</p>
    </section>:<section className="adminImageGrid">
      {rows.map(item=><article className="adminMediaCard" key={item.id}>
        <img src={item.url} alt={item.alt||""}/>
        <div className="adminMediaCardBody">
          <b>{item.alt||"Imagem sem descrição"}</b>
          <small>{item.provider}{item.sizeBytes?" • "+Math.round(item.sizeBytes/1024)+" KB":""}</small>
        </div>
      </article>)}
    </section>}
  </main>;
}
