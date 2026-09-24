import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {createProductionBatch,setProductionBatchStatus} from "../../../../../lib/kitchen-actions";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();
  const [batches,stations,products,ingredients]=await Promise.all([
    prisma.restaurantProductionBatch.findMany({
      include:{station:true,product:true,ingredient:true},
      orderBy:[{status:"asc"},{producedAt:"desc"}],
      take:200
    }),
    prisma.restaurantStation.findMany({where:{active:true},orderBy:{sortOrder:"asc"}}),
    prisma.restaurantProduct.findMany({where:{active:true},orderBy:{name:"asc"}}),
    prisma.restaurantIngredient.findMany({where:{active:true},orderBy:{name:"asc"}})
  ]);
  const active=batches.filter(batch=>batch.status==="ACTIVE");

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0</small><h1>Produção</h1><p>Registre pré-preparo, porções e lotes produzidos para organizar mise en place, validade e perdas.</p></div>
      <div className="kitchenHeroBadge"><b>{active.length}</b><span>lotes ativos</span></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/producao"/>

    <section className="kitchenTwoCol">
      <form action={createProductionBatch} className="kitchenPanel kitchenForm">
        <div className="kitchenPanelHead"><div><small>NOVO LOTE</small><h2>Registrar produção</h2></div></div>
        <label>Nome / identificação<input name="label" required placeholder="Ex.: Arroz branco almoço"/></label>
        <div className="kitchenFormGrid">
          <label>Quantidade<input name="quantity" type="number" step=".001" min=".001" required/></label>
          <label>Unidade<input name="unit" defaultValue="un"/></label>
        </div>
        <label>Estação<select name="stationId"><option value="">Sem estação</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Produto relacionado<select name="productId"><option value="">Nenhum</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Insumo relacionado<select name="ingredientId"><option value="">Nenhum</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        <label>Validade<input name="expiresAt" type="datetime-local"/></label>
        <label>Observações<textarea name="notes" rows={3}/></label>
        <button className="kitchenPrimary">Registrar lote</button>
      </form>

      <section className="kitchenPanel productionSummary">
        <div className="kitchenPanelHead"><div><small>VISÃO RÁPIDA</small><h2>Mise en place</h2></div></div>
        <div className="productionStats">
          <div><strong>{active.length}</strong><span>ativos</span></div>
          <div><strong>{active.filter(b=>b.expiresAt&&b.expiresAt.getTime()<Date.now()+6*3600000).length}</strong><span>vencem em 6h</span></div>
          <div><strong>{batches.filter(b=>b.status==="DISCARDED").length}</strong><span>descartados</span></div>
        </div>
        <p>Use os lotes para acompanhar produção antecipada. Estoque físico continua controlado em Insumos/CMV.</p>
      </section>
    </section>

    <section className="productionGrid">
      {batches.map(batch=><article className={"productionCard status-"+batch.status.toLowerCase()} key={batch.id}>
        <div className="productionCardHead">
          <div><small>{batch.station?.name||"GERAL"} • {batch.status}</small><h3>{batch.label}</h3></div>
          <strong>{batch.quantity} {batch.unit}</strong>
        </div>
        <p>{batch.product?.name||batch.ingredient?.name||"Produção livre"}</p>
        <div className="productionMeta">
          <span>Produzido {batch.producedAt.toLocaleString("pt-BR")}</span>
          {batch.expiresAt&&<span>Validade {batch.expiresAt.toLocaleString("pt-BR")}</span>}
          {batch.actorName&&<span>Por {batch.actorName}</span>}
        </div>
        {batch.notes&&<p className="productionNotes">{batch.notes}</p>}
        {batch.status==="ACTIVE"&&<div className="productionActions">
          <form action={setProductionBatchStatus}><input type="hidden" name="id" value={batch.id}/><input type="hidden" name="status" value="CONSUMED"/><button>Finalizar consumo</button></form>
          <form action={setProductionBatchStatus}><input type="hidden" name="id" value={batch.id}/><input type="hidden" name="status" value="DISCARDED"/><button className="danger">Descartar</button></form>
        </div>}
      </article>)}
    </section>
  </main>;
}
