import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";

export const dynamic="force-dynamic";

const money=(v:number)=>(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";

export default async function Page(){
  await requireAdmin();
  const since=new Date(Date.now()-30*86400000);
  const [orders,items,movements,ingredients]=await Promise.all([
    prisma.restaurantOrder.findMany({
      where:{createdAt:{gte:since},status:{not:"CANCELLED"}},
      select:{createdAt:true,totalCents:true}
    }),
    prisma.restaurantOrderItem.findMany({
      where:{order:{createdAt:{gte:since},status:{not:"CANCELLED"}}},
      select:{productId:true,nameSnapshot:true,quantity:true,totalCents:true,unitCostCents:true}
    }),
    prisma.restaurantIngredientMovement.findMany({
      where:{createdAt:{gte:since},type:{in:["WASTE","LOSS"]}},
      include:{ingredient:true}
    }),
    prisma.restaurantIngredient.findMany({select:{stockQty:true,costPerUnitCents:true}})
  ]);

  const revenue=orders.reduce((sum,order)=>sum+order.totalCents,0);
  const ticket=orders.length?Math.round(revenue/orders.length):0;
  const directCost=items.reduce((sum,item)=>sum+(item.unitCostCents||0)*item.quantity,0);
  const wasteCost=Math.round(movements.reduce((sum,movement)=>sum+Math.abs(movement.quantity)*movement.ingredient.costPerUnitCents,0));
  const effectiveCost=directCost+wasteCost;
  const grossMargin=revenue-effectiveCost;
  const cmvRate=revenue?effectiveCost/revenue*100:0;
  const grossMarginRate=revenue?grossMargin/revenue*100:0;
  const stockValue=Math.round(ingredients.reduce((sum,item)=>sum+item.stockQty*item.costPerUnitCents,0));

  const hours=Array.from({length:24},(_,hour)=>({
    hour,
    count:orders.filter(order=>order.createdAt.getHours()===hour).length
  })).sort((a,b)=>b.count-a.count).slice(0,4);

  const productMap=new Map<string,{name:string;qty:number;revenue:number;cost:number}>();
  for(const item of items){
    const row=productMap.get(item.productId)||{name:item.nameSnapshot,qty:0,revenue:0,cost:0};
    row.qty+=item.quantity;
    row.revenue+=item.totalCents;
    row.cost+=(item.unitCostCents||0)*item.quantity;
    productMap.set(item.productId,row);
  }
  const products=[...productMap.values()]
    .map(row=>({...row,cmv:row.revenue?row.cost/row.revenue*100:0,margin:row.revenue-row.cost}))
    .sort((a,b)=>b.revenue-a.revenue);

  let accumulated=0;

  return <main className="cmvPage">
    <section className="cmvHero">
      <div>
        <small>MORIAH FOOD / BI FINANCEIRO</small>
        <h1>CMV <span>& margem</span></h1>
        <p>Leitura dos últimos 30 dias com vendas, custo direto registrado, perdas de insumos e margem bruta estimada.</p>
      </div>
      <Link href="/admin/restaurante/insumos">Gerenciar insumos →</Link>
    </section>

    <section className="cmvMetrics">
      <article><small>RECEITA / 30 DIAS</small><strong>{money(revenue)}</strong><span>{orders.length} pedidos • ticket {money(ticket)}</span></article>
      <article><small>CMV EFETIVO</small><strong>{money(effectiveCost)}</strong><span>{pct(cmvRate)} da receita</span></article>
      <article><small>MARGEM BRUTA</small><strong>{money(grossMargin)}</strong><span>{pct(grossMarginRate)} da receita</span></article>
      <article><small>PERDAS</small><strong>{money(wasteCost)}</strong><span>{movements.length} registros no período</span></article>
      <article><small>ESTOQUE ATUAL</small><strong>{money(stockValue)}</strong><span>capital estimado em insumos</span></article>
    </section>

    <section className="cmvSplit">
      <article className="cmvGaugeCard">
        <small>COMPOSIÇÃO DO CMV</small>
        <h2>{pct(cmvRate)}</h2>
        <div className="cmvGauge"><i style={{width:Math.min(100,cmvRate)+"%"}}/></div>
        <div className="cmvComposition">
          <span><b>{money(directCost)}</b> custo direto vendido</span>
          <span><b>{money(wasteCost)}</b> perdas registradas</span>
        </div>
        <p>O percentual usa receita realizada no período. Perdas entram separadamente para não esconder desperdício dentro do custo do produto.</p>
      </article>

      <article className="cmvPeakCard">
        <small>OPERAÇÃO</small>
        <h2>Horários de pico</h2>
        <div>
          {hours.map((row,index)=><span key={row.hour}><b>{index+1}</b><strong>{String(row.hour).padStart(2,"0")}:00</strong><small>{row.count} pedido(s)</small></span>)}
          {!hours.some(row=>row.count>0)&&<p>Sem pedidos no período.</p>}
        </div>
      </article>
    </section>

    <section className="cmvSectionHead">
      <div><small>PRODUTO A PRODUTO</small><h2>Rentabilidade do cardápio</h2></div>
      <p>Receita e custo são baseados nos itens vendidos. A coluna ABC mostra concentração de faturamento; CMV mostra peso do custo em cada produto.</p>
    </section>

    <div className="cmvProductTable">
      <div className="cmvProductHeader"><span>ABC</span><span>Produto</span><span>Qtd.</span><span>Receita</span><span>Custo</span><span>CMV</span><span>Margem</span></div>
      {products.map(row=>{
        accumulated+=row.revenue;
        const share=revenue?accumulated/revenue*100:0;
        const abc=share<=80?"A":share<=95?"B":"C";
        return <div className="cmvProductRow" key={row.name}>
          <span><b className={"abcTag abc"+abc}>{abc}</b></span>
          <span><b>{row.name}</b></span>
          <span>{row.qty}</span>
          <span>{money(row.revenue)}</span>
          <span>{money(row.cost)}</span>
          <span><b>{pct(row.cmv)}</b><i style={{width:Math.min(100,row.cmv)+"%"}}/></span>
          <span>{money(row.margin)}</span>
        </div>;
      })}
      {!products.length&&<div className="inventoryEmpty">Ainda não há vendas suficientes para calcular CMV.</div>}
    </div>

    <section className="cmvLosses">
      <div><small>PERDAS / DESPERDÍCIO</small><h2>Impacto registrado</h2></div>
      {movements.length?<div>{movements.slice(0,12).map(movement=><article key={movement.id}>
        <strong>{movement.ingredient.name}</strong>
        <span>{Math.abs(movement.quantity).toLocaleString("pt-BR",{maximumFractionDigits:3})} {movement.ingredient.unit}</span>
        <b>{money(Math.round(Math.abs(movement.quantity)*movement.ingredient.costPerUnitCents))}</b>
      </article>)}</div>:<p>Nenhuma perda registrada nos últimos 30 dias.</p>}
    </section>
  </main>;
}
