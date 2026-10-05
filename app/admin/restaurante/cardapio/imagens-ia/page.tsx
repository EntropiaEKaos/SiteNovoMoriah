import Link from "next/link";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {createImageDraft,generateImageCandidate,rejectImageCandidate,approveImageCandidate,importProductImage} from "./actions";
import {foodImageProviderStatus} from "../../../../../lib/food-image-provider";

export const dynamic="force-dynamic";

const pilots=["Carne de panela","Isca de frango","Panqueca de frango"];

export default async function FoodAiImagesPage(){
  await requireAdmin();
  const provider=foodImageProviderStatus();
  const [products,candidates]=await Promise.all([
    prisma.restaurantProduct.findMany({
      include:{category:true},
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    }),
    prisma.restaurantProductImageCandidate.findMany({
      include:{product:{include:{category:true}}},
      orderBy:{createdAt:"desc"},
      take:100
    })
  ]);
  const pilotProducts=pilots.map(name=>products.find(p=>p.name===name)).filter(Boolean);
  const missing=products.filter(p=>!p.imageUrl);
  const ready=candidates.filter(c=>c.status==="READY");
  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / MENU STUDIO / IMAGENS IA</small>
        <h1>Fotos com aprovação humana.</h1>
        <p>A IA prepara candidatos. A foto pública do produto só muda quando um administrador aprova explicitamente.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante/cardapio">← Cardápio Studio</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Sem imagem</small><strong>{missing.length}</strong></div>
      <div><small>Candidatos</small><strong>{candidates.length}</strong></div>
      <div><small>Prontos</small><strong>{ready.length}</strong></div>
      <div><small>Aprovados</small><strong>{candidates.filter(c=>c.status==="APPROVED").length}</strong></div>
      <div><small>Provedor IA</small><strong>{provider.configured?"ATIVO":"OFF"}</strong></div>
    </section>

    {!provider.configured&&<p className="adminPageNote">Geração automática está desligada. Você pode importar imagens prontas abaixo; elas entram na mesma fila de aprovação antes da publicação.</p>}

    <section className="adminSectionCard" style={{marginBottom:22}}>
      <div className="menuStudioSectionTitle">
        <div><small>IMPORTAÇÃO DIRETA</small><h2>Enviar foto para um produto</h2></div>
        <span className="adminChip">S3 + aprovação</span>
      </div>
      <form action={importProductImage} className="adminStack">
        <label>Produto<select name="productId" required>{products.map(product=><option key={product.id} value={product.id}>{product.category.name} — {product.name}</option>)}</select></label>
        <label>Imagem<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required/></label>
        <small>JPEG, PNG ou WebP • máximo 3,5 MB. O envio cria um candidato READY; a foto pública só muda após aprovação.</small>
        <div><button className="highlight">Enviar para aprovação</button></div>
      </form>
    </section>

    <section className="adminSectionCard" style={{marginBottom:22}}>
      <div className="menuStudioSectionTitle">
        <div><small>FASE PILOTO</small><h2>3 produtos para calibrar o padrão</h2></div>
        <span className="adminChip">Publicação manual</span>
      </div>
      <div className="menuStudioProductGrid">
        {pilotProducts.map(product=><div className="menuStudioProductCard" key={product!.id}>
          <div className="menuStudioProductImage">
            {product!.imageUrl?<img src={product!.imageUrl} alt={product!.name}/>:<div>IA</div>}
          </div>
          <div className="menuStudioProductBody">
            <small>{product!.category.name}</small><h3>{product!.name}</h3>
            <p>{product!.description||"Sem descrição."}</p>
            <form action={createImageDraft}>
              <input type="hidden" name="productId" value={product!.id}/>
              <button>Criar prompt candidato</button>
            </form>
          </div>
        </div>)}
      </div>
    </section>

    <section className="adminSectionCard">
      <div className="menuStudioSectionTitle">
        <div><small>FILA DE APROVAÇÃO</small><h2>Candidatos</h2></div>
      </div>
      {candidates.length===0?<div className="adminEmptyState"><strong>Nenhum candidato ainda.</strong><p>Crie os três pilotos acima para iniciar a calibração.</p></div>:
      <div className="adminStack">
        {candidates.map(candidate=><article className="adminSectionCard" key={candidate.id}>
          <div className="menuStudioSectionTitle">
            <div><small>{candidate.product.category.name} • {candidate.status}</small><h3>{candidate.product.name}</h3></div>
            <span className="adminChip">{candidate.provider}</span>
          </div>
          {candidate.imageUrl&&<div className="menuStudioImagePreview"><img src={candidate.imageUrl} alt={candidate.product.name}/></div>}
          <details><summary>Ver prompt</summary><p style={{whiteSpace:"pre-wrap"}}>{candidate.prompt}</p></details>
          {candidate.errorMessage&&<p className="adminPageNote">{candidate.errorMessage}</p>}
          <div className="adminInlineActions">
            {["DRAFT","FAILED"].includes(candidate.status)&&<form action={generateImageCandidate}><input type="hidden" name="candidateId" value={candidate.id}/><button disabled={!provider.configured}>{candidate.status==="FAILED"?"Gerar novamente":"Gerar imagem"}</button></form>}
            {candidate.status==="READY"&&<form action={approveImageCandidate}><input type="hidden" name="candidateId" value={candidate.id}/><button className="highlight">Aprovar e publicar</button></form>}
            {!["APPROVED","REJECTED"].includes(candidate.status)&&<form action={rejectImageCandidate}><input type="hidden" name="candidateId" value={candidate.id}/><button className="danger">Descartar</button></form>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
