import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {
  createRestaurantSupplier,
  receiveIngredientPurchase,
  recordPhysicalInventory,
  updateIngredientPlanning
} from "../../../../lib/restaurant-procurement-actions";

export const dynamic="force-dynamic";
const money=(v:number)=>(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const qty=(v:number)=>v.toLocaleString("pt-BR",{maximumFractionDigits:3});

export default async function PurchasesPage(){
  await requireAdmin();
  const since=new Date(Date.now()-30*86400000);
  const [suppliers,ingredients,purchases,counts,movements]=await Promise.all([
    prisma.restaurantSupplier.findMany({where:{active:true},orderBy:{name:"asc"}}),
    prisma.restaurantIngredient.findMany({where:{active:true},orderBy:{name:"asc"}}),
    prisma.restaurantPurchase.findMany({
      where:{purchasedAt:{gte:since}},
      include:{supplier:true,items:{include:{ingredient:true}}},
      orderBy:{purchasedAt:"desc"},
      take:80
    }),
    prisma.restaurantInventoryCount.findMany({
      include:{items:{include:{ingredient:true}}},
      orderBy:{countedAt:"desc"},
      take:30
    }),
    prisma.restaurantIngredientMovement.findMany({
      where:{createdAt:{gte:new Date(Date.now()-30*86400000)},type:{in:["OUT","WASTE","LOSS"]}},
      include:{ingredient:true}
    })
  ]);

  const spend=purchases.reduce((s,p)=>s+p.totalCents,0);
  const expiring=purchases.flatMap(p=>p.items).filter(i=>i.expiresAt&&i.expiresAt.getTime()<Date.now()+7*86400000&&i.expiresAt.getTime()>=Date.now());
  const consumption=new Map<string,number>();
  for(const move of movements){
    consumption.set(move.ingredientId,(consumption.get(move.ingredientId)||0)+Math.abs(move.quantity));
  }
  const suggestions=ingredients.map(i=>{
    const used30=consumption.get(i.id)||0;
    const daily=used30/30;
    const daysCover=daily>0?i.stockQty/daily:null;
    const targetQty=daily*i.targetDaysCover;
    const suggested=Math.max(0,targetQty-i.stockQty);
    return {ingredient:i,used30,daily,daysCover,suggested};
  }).sort((a,b)=>(a.daysCover??999)-(b.daysCover??999));

  return <main className="inventoryPage">
    <section className="inventoryHero">
      <div>
        <small>MORIAH FOOD / SUPRIMENTOS</small>
        <h1>Compras <span>& inventário</span></h1>
        <p>Fornecedores, entradas, custo médio, lote, validade, contagem física e sugestão de reposição conectados ao CMV.</p>
      </div>
      <div className="inventoryHeroActions">
        <Link href="/admin/restaurante/insumos">Insumos & CMV →</Link>
        <Link href="/admin/restaurante/bi">BI financeiro →</Link>
      </div>
    </section>

    <section className="inventoryMetrics">
      <article><small>COMPRAS / 30 DIAS</small><strong>{money(spend)}</strong><span>{purchases.length} recebimento(s)</span></article>
      <article><small>FORNECEDORES</small><strong>{suppliers.length}</strong><span>ativos</span></article>
      <article className={expiring.length?"isAlert":""}><small>VENCEM EM 7 DIAS</small><strong>{expiring.length}</strong><span>lotes monitorados</span></article>
      <article><small>CONTAGENS</small><strong>{counts.length}</strong><span>inventários recentes</span></article>
      <article><small>REPOSIÇÃO</small><strong>{suggestions.filter(x=>x.suggested>0).length}</strong><span>itens abaixo da cobertura alvo</span></article>
    </section>

    <section className="inventoryComposer">
      <form action={createRestaurantSupplier} className="inventoryForm dark" data-feedback-success="Fornecedor criado com sucesso.">
        <small>FORNECEDOR</small><h2>Novo fornecedor</h2>
        <div className="inventoryFormGrid">
          <label><span>Nome</span><input name="name" required/></label>
          <label><span>CNPJ/CPF</span><input name="document"/></label>
          <label><span>Contato</span><input name="contactName"/></label>
          <label><span>Telefone</span><input name="phone"/></label>
          <label className="wide"><span>E-mail</span><input name="email" type="email"/></label>
          <label className="wide"><span>Observações</span><input name="notes"/></label>
        </div>
        <button>Cadastrar fornecedor</button>
      </form>

      <form action={receiveIngredientPurchase} className="inventoryForm accent" data-feedback-success="Compra recebida e estoque atualizado.">
        <small>RECEBIMENTO</small><h2>Entrada de compra</h2>
        <label><span>Fornecedor</span><select name="supplierId"><option value="">Sem fornecedor</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label><span>Insumo</span><select name="ingredientId" required><option value="">Selecione</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} • estoque {qty(i.stockQty)} {i.unit}</option>)}</select></label>
        <div className="inventoryFormGrid">
          <label><span>Qtd. comprada</span><input name="purchaseQty" type="number" step=".001" min=".001" required/></label>
          <label><span>Unidade compra</span><input name="purchaseUnit" required placeholder="caixa, kg, pacote"/></label>
          <label><span>Conversão p/ estoque</span><input name="conversionFactor" type="number" step=".001" min=".001" defaultValue="1" required/></label>
          <label><span>Custo por unidade compra</span><input name="unitPurchaseCost" inputMode="decimal" required placeholder="0,00"/></label>
          <label><span>Nota / documento</span><input name="invoiceNumber"/></label>
          <label><span>Lote</span><input name="lotCode"/></label>
          <label className="wide"><span>Validade</span><input name="expiresAt" type="date"/></label>
        </div>
        <button>Receber e atualizar custo médio</button>
      </form>
    </section>

    <section className="inventorySectionHead">
      <div><small>PLANEJAMENTO</small><h2>Cobertura e sugestão de compra</h2></div>
      <p>Consumo médio usa saídas/perdas dos últimos 30 dias. A sugestão repõe até a cobertura alvo cadastrada para cada insumo.</p>
    </section>
    <div className="recipeCostTable">
      <div className="recipeCostHeader" style={{gridTemplateColumns:"1.5fr .7fr .7fr .7fr 1fr"}}><span>Insumo</span><span>Consumo 30d</span><span>Cobertura</span><span>Sugestão</span><span>Planejamento</span></div>
      {suggestions.map(row=><div className="recipeCostRow" style={{gridTemplateColumns:"1.5fr .7fr .7fr .7fr 1fr"}} key={row.ingredient.id}>
        <span><b>{row.ingredient.name}</b><small>{money(row.ingredient.costPerUnitCents)}/{row.ingredient.unit}</small></span>
        <span>{qty(row.used30)} {row.ingredient.unit}</span>
        <span>{row.daysCover==null?"—":row.daysCover.toFixed(1)+" dias"}</span>
        <span><b>{qty(row.suggested)} {row.ingredient.unit}</b></span>
        <span>
          <form action={updateIngredientPlanning} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}} data-feedback-success="Planejamento do insumo atualizado.">
            <input type="hidden" name="ingredientId" value={row.ingredient.id}/>
            <input name="targetDaysCover" type="number" min="1" max="180" defaultValue={row.ingredient.targetDaysCover} title="Dias de cobertura"/>
            <input name="purchaseUnit" defaultValue={row.ingredient.purchaseUnit||row.ingredient.unit} title="Unidade de compra"/>
            <input name="purchaseToStockFactor" type="number" step=".001" min=".001" defaultValue={row.ingredient.purchaseToStockFactor} title="Conversão"/>
            <button>Salvar</button>
          </form>
        </span>
      </div>)}
    </div>

    <section className="inventorySectionHead">
      <div><small>INVENTÁRIO FÍSICO</small><h2>Contagem e divergência</h2></div>
      <p>A contagem registra saldo anterior, contado, diferença e impacto financeiro antes de ajustar o estoque oficial.</p>
    </section>
    <form action={recordPhysicalInventory} className="inventoryForm dark" style={{marginBottom:20}} data-feedback-success="Inventário físico registrado com sucesso.">
      <div className="inventoryFormGrid">
        <label><span>Insumo</span><select name="ingredientId" required><option value="">Selecione</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} • sistema {qty(i.stockQty)} {i.unit}</option>)}</select></label>
        <label><span>Quantidade contada</span><input name="countedQty" type="number" min="0" step=".001" required/></label>
        <label className="wide"><span>Observação</span><input name="notes" placeholder="Contagem de fechamento, conferência semanal..."/></label>
      </div>
      <button>Registrar contagem física</button>
    </form>

    <section className="inventorySectionHead">
      <div><small>HISTÓRICO</small><h2>Últimas compras</h2></div>
    </section>
    <div className="recipeCostTable">
      <div className="recipeCostHeader" style={{gridTemplateColumns:"1fr 1.2fr .8fr .8fr .8fr"}}><span>Data</span><span>Fornecedor / insumo</span><span>Qtd.</span><span>Custo</span><span>Lote / validade</span></div>
      {purchases.flatMap(p=>p.items.map(item=><div className="recipeCostRow" style={{gridTemplateColumns:"1fr 1.2fr .8fr .8fr .8fr"}} key={item.id}>
        <span>{p.purchasedAt.toLocaleDateString("pt-BR")}</span>
        <span><b>{p.supplier?.name||"Sem fornecedor"}</b><small>{item.ingredient.name}</small></span>
        <span>{qty(item.purchaseQty)} {item.purchaseUnit}<small>+ {qty(item.stockQtyAdded)} {item.ingredient.unit}</small></span>
        <span>{money(item.totalCents)}<small>{money(item.unitStockCostCents)}/{item.ingredient.unit}</small></span>
        <span>{item.lotCode||"—"}<small>{item.expiresAt?item.expiresAt.toLocaleDateString("pt-BR"):"sem validade"}</small></span>
      </div>))}
    </div>
  </main>;
}
