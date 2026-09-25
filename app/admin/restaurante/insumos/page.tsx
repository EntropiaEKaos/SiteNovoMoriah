import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {
  createIngredient,
  adjustIngredientStock,
  addRecipeItem,
  recordIngredientWaste,
  updateIngredientControls
} from "../../../../lib/restaurant-actions";

export const dynamic="force-dynamic";

const money=(v:number)=>(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const qty=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:3}).format(v);

export default async function Page(){
  await requireAdmin();
  const since=new Date(Date.now()-30*86400000);
  const [ingredients,products,movements]=await Promise.all([
    prisma.restaurantIngredient.findMany({
      include:{recipes:{include:{product:true}}},
      orderBy:{name:"asc"}
    }),
    prisma.restaurantProduct.findMany({
      where:{active:true},
      include:{recipes:{include:{ingredient:true}}},
      orderBy:{name:"asc"}
    }),
    prisma.restaurantIngredientMovement.findMany({
      where:{createdAt:{gte:since}},
      include:{ingredient:true},
      orderBy:{createdAt:"desc"}
    })
  ]);

  const stockValue=Math.round(ingredients.reduce((sum,item)=>sum+item.stockQty*item.costPerUnitCents,0));
  const critical=ingredients.filter(item=>item.stockQty<=item.minStockQty);
  const waste=movements.filter(item=>["WASTE","LOSS"].includes(item.type));
  const wasteCost=Math.round(waste.reduce((sum,item)=>sum+Math.abs(item.quantity)*item.ingredient.costPerUnitCents,0));
  const entries=movements.filter(item=>item.type==="IN"&&item.quantity>0);
  const purchaseValue=Math.round(entries.reduce((sum,item)=>sum+item.quantity*item.ingredient.costPerUnitCents,0));
  const unlinked=ingredients.filter(item=>item.recipes.length===0).length;
  const recipeRows=products.map(product=>{
    const recipeCost=Math.round(product.recipes.reduce((sum,row)=>sum+row.quantity*row.ingredient.costPerUnitCents,0));
    const cmv=product.priceCents>0?recipeCost/product.priceCents*100:0;
    return {...product,recipeCost,cmv,grossMargin:product.priceCents-recipeCost};
  }).sort((a,b)=>b.cmv-a.cmv);

  return <main className="inventoryPage">
    <section className="inventoryHero">
      <div>
        <small>MORIAH FOOD / CUSTO & ESTOQUE</small>
        <h1>Insumos <span>& CMV</span></h1>
        <p>Estoque, ficha técnica, perdas e custo real do cardápio na mesma operação. Ajustes atualizam os indicadores e o estoque crítico gera alerta no Admin.</p>
      </div>
      <div className="inventoryHeroActions">
        <Link href="/admin/restaurante/bi">Abrir BI financeiro →</Link>
        <Link href="/admin/restaurante/cardapio">Cardápio →</Link>
      </div>
    </section>

    <section className="inventoryMetrics">
      <article><small>VALOR EM ESTOQUE</small><strong>{money(stockValue)}</strong><span>{ingredients.length} insumos ativos</span></article>
      <article className={critical.length?"isAlert":""}><small>ESTOQUE CRÍTICO</small><strong>{critical.length}</strong><span>no mínimo ou abaixo</span></article>
      <article><small>PERDAS / 30 DIAS</small><strong>{money(wasteCost)}</strong><span>{waste.length} movimentos</span></article>
      <article><small>ENTRADAS / 30 DIAS</small><strong>{money(purchaseValue)}</strong><span>{entries.length} entradas</span></article>
      <article><small>SEM FICHA TÉCNICA</small><strong>{unlinked}</strong><span>insumos não vinculados</span></article>
    </section>

    {critical.length>0&&<section className="inventoryCritical">
      <div><small>ATENÇÃO OPERACIONAL</small><h2>Reposição necessária</h2></div>
      <div className="inventoryCriticalList">
        {critical.slice(0,8).map(item=><span key={item.id}><b>{item.name}</b> {qty(item.stockQty)} / mín. {qty(item.minStockQty)} {item.unit}</span>)}
      </div>
    </section>}

    <section className="inventoryComposer">
      <form action={createIngredient} className="inventoryForm dark">
        <small>CADASTRO</small><h2>Novo insumo</h2>
        <div className="inventoryFormGrid">
          <label><span>Nome</span><input name="name" required placeholder="Queijo, bacon, arroz..."/></label>
          <label><span>Unidade</span><input name="unit" required placeholder="kg, g, un, ml"/></label>
          <label><span>Estoque inicial</span><input name="stockQty" type="number" step=".001" min="0" placeholder="0"/></label>
          <label><span>Estoque mínimo</span><input name="minStockQty" type="number" step=".001" min="0" placeholder="0"/></label>
          <label className="wide"><span>Custo por unidade</span><input name="costPerUnit" inputMode="decimal" placeholder="0,00"/></label>
        </div>
        <button>Cadastrar insumo</button>
      </form>

      <form action={addRecipeItem} className="inventoryForm accent">
        <small>FICHA TÉCNICA</small><h2>Composição do produto</h2>
        <label><span>Produto</span><select name="productId" required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label><span>Insumo</span><select name="ingredientId" required><option value="">Selecione</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} • {i.unit}</option>)}</select></label>
        <label><span>Quantidade consumida por unidade vendida</span><input name="quantity" type="number" step=".001" min=".001" required placeholder="Ex.: 0,120"/></label>
        <button>Vincular / atualizar ficha</button>
      </form>
    </section>

    <section className="inventorySectionHead">
      <div><small>MATÉRIA-PRIMA</small><h2>Estoque e parâmetros</h2></div>
      <p>Edite custo e mínimo sem recriar o insumo. Entradas, saídas e perdas ficam registradas no histórico operacional.</p>
    </section>

    <div className="ingredientGrid">
      {ingredients.map(item=>{
        const isCritical=item.stockQty<=item.minStockQty;
        const value=Math.round(item.stockQty*item.costPerUnitCents);
        const linked=item.recipes.map(row=>row.product.name);
        return <article key={item.id} className={"ingredientCard"+(isCritical?" isCritical":"")}>
          <header>
            <div><small>{item.unit.toUpperCase()} • {money(item.costPerUnitCents)}/{item.unit}</small><h3>{item.name}</h3></div>
            <span>{isCritical?"CRÍTICO":"OK"}</span>
          </header>
          <div className="ingredientBalance"><strong>{qty(item.stockQty)}</strong><span>{item.unit}<small>mínimo {qty(item.minStockQty)}</small></span></div>
          <div className="ingredientValue"><span>Valor estimado</span><b>{money(value)}</b></div>
          <p className="ingredientLinks">{linked.length?"Usado em "+linked.join(", "):"Ainda não vinculado a uma ficha técnica."}</p>

          <details className="ingredientControls">
            <summary>Gerenciar insumo</summary>
            <form action={updateIngredientControls}>
              <input type="hidden" name="ingredientId" value={item.id}/>
              <label><span>Custo / {item.unit}</span><input name="costPerUnit" defaultValue={(item.costPerUnitCents/100).toFixed(2)} inputMode="decimal"/></label>
              <label><span>Estoque mínimo</span><input name="minStockQty" type="number" step=".001" min="0" defaultValue={item.minStockQty}/></label>
              <button>Salvar parâmetros</button>
            </form>
            <form action={adjustIngredientStock}>
              <input type="hidden" name="ingredientId" value={item.id}/>
              <label><span>Ajuste de estoque</span><input name="quantity" type="number" step=".001" required placeholder="+10 ou -1"/></label>
              <label><span>Motivo</span><input name="reason" required placeholder="Compra, inventário, correção..."/></label>
              <button>Ajustar saldo</button>
            </form>
            <form action={recordIngredientWaste} className="wasteForm">
              <input type="hidden" name="ingredientId" value={item.id}/>
              <label><span>Quantidade perdida</span><input name="quantity" type="number" step=".001" min=".001" required placeholder="0"/></label>
              <label><span>Motivo da perda</span><input name="reason" required placeholder="Validade, quebra, preparo..."/></label>
              <button>Registrar perda</button>
            </form>
          </details>
        </article>;
      })}
    </div>

    <section className="inventorySectionHead recipeHead">
      <div><small>FICHA TÉCNICA / PREÇO</small><h2>CMV teórico do cardápio</h2></div>
      <p>Calculado pelo custo atual dos insumos da ficha. Serve para enxergar rapidamente quais produtos concentram maior custo sobre o preço de venda.</p>
    </section>

    <div className="recipeCostTable">
      <div className="recipeCostHeader"><span>Produto</span><span>Preço</span><span>Ficha</span><span>CMV</span><span>Margem bruta</span></div>
      {recipeRows.map(row=><div className="recipeCostRow" key={row.id}>
        <span><b>{row.name}</b><small>{row.recipes.length} insumo(s)</small></span>
        <span>{money(row.priceCents)}</span>
        <span>{money(row.recipeCost)}</span>
        <span><b>{row.cmv.toFixed(1).replace(".",",")}%</b><i style={{width:Math.min(100,row.cmv)+"%"}}/></span>
        <span>{money(row.grossMargin)}</span>
      </div>)}
      {!recipeRows.length&&<div className="inventoryEmpty">Nenhum produto ativo para calcular.</div>}
    </div>
  </main>;
}
