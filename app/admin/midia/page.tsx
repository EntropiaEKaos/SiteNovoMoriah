import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";

export const dynamic="force-dynamic";

export default async function Page({
  searchParams
}:{
  searchParams:Promise<{folder?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const folder=String(params.folder||"").trim();

  const [rows,total,folders]=await Promise.all([
    prisma.media.findMany({
      where:folder?{folder}:undefined,
      orderBy:[{sortOrder:"asc"},{createdAt:"desc"}],
      take:300
    }),
    prisma.media.count(),
    prisma.media.findMany({
      where:{folder:{not:null}},
      distinct:["folder"],
      select:{folder:true},
      orderBy:{folder:"asc"}
    })
  ]);

  const s3=rows.filter(row=>row.provider==="S3").length;
  const totalBytes=rows.reduce((sum,row)=>sum+(row.sizeBytes||0),0);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / BIBLIOTECA</small>
        <h1>Mídia</h1>
        <p>Visão limpa do acervo, organizada por pasta e prioridade. Edição e upload ficam centralizados no Media Center.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminPrimaryAction" href="/admin/galeria">Abrir Media Center</Link>
        <Link className="adminSecondaryAction" href="/admin/site">Editor do site →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Total no acervo</small><strong>{total}</strong></div>
      <div><small>Exibidos</small><strong>{rows.length}</strong></div>
      <div><small>No S3</small><strong>{s3}</strong></div>
      <div><small>Tamanho exibido</small><strong style={{fontSize:18}}>{(totalBytes/1024/1024).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB</strong></div>
    </section>

    <section className="adminSectionCard" style={{marginBottom:20}}>
      <form method="get" className="adminFormGrid">
        <label>Pasta
          <select name="folder" defaultValue={folder}>
            <option value="">Todas as pastas</option>
            {folders.map(item=>item.folder&&<option key={item.folder} value={item.folder}>{item.folder}</option>)}
          </select>
        </label>
        <button>Filtrar biblioteca</button>
      </form>
    </section>

    {rows.length===0?<section className="adminEmptyState">
      <strong>Nenhuma mídia encontrada.</strong>
      <p>Abra o Media Center para enviar ou organizar arquivos.</p>
    </section>:<section className="adminImageGrid mediaLibraryGrid">
      {rows.map(item=><article className="adminMediaCard" key={item.id}>
        <img src={item.url} alt={item.alt||""}/>
        <div className="adminMediaCardBody">
          <b>{item.label||item.alt||"Imagem sem título"}</b>
          <small>{item.folder||"Sem pasta"} • {item.provider}{item.sizeBytes?" • "+Math.round(item.sizeBytes/1024)+" KB":""}</small>
          <div className="adminMetaRow">
            <span className="adminChip">ordem {item.sortOrder}</span>
          </div>
          <div className="adminInlineActions">
            <a href={item.url} target="_blank" rel="noreferrer">Abrir ↗</a>
            <Link href="/admin/galeria">Editar</Link>
          </div>
        </div>
      </article>)}
    </section>}
  </main>;
}
