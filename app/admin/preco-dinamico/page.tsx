import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createRateRule,deleteRateRule} from "../actions";

export const dynamic="force-dynamic";

function adjustment(rule:{adjustmentType:string;adjustmentValue:number}){
  if(rule.adjustmentType==="PERCENT"){
    return (rule.adjustmentValue>0?"+":"")+rule.adjustmentValue+"%";
  }
  return (rule.adjustmentValue>0?"+":"")+(rule.adjustmentValue/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

export default async function Page(){
  await requireAdmin();

  const [rules,rooms]=await Promise.all([
    prisma.rateRule.findMany({
      include:{accommodation:true},
      orderBy:[{priority:"asc"},{createdAt:"desc"}]
    }),
    prisma.accommodation.findMany({
      where:{active:true},
      orderBy:{name:"asc"}
    })
  ]);

  const active=rules.filter(rule=>rule.active).length;
  const increases=rules.filter(rule=>rule.adjustmentValue>0).length;
  const reductions=rules.filter(rule=>rule.adjustmentValue<0).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / REVENUE AUTOMATION</small>
        <h1>Preço dinâmico</h1>
        <p>Automatize ajustes de diária por ocupação, antecedência e período. As regras entram no motor depois da tarifa base e dos ajustes sazonais.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/tarifas">Tarifas →</Link>
        <Link className="adminSecondaryAction" href="/admin/promocoes">Promoções →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Regras</small><strong>{rules.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Aumentos</small><strong>{increases}</strong></div>
      <div><small>Reduções</small><strong>{reductions}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Nova regra</h2>
        <p>Valores positivos aumentam a diária; negativos reduzem. Deixe faixas vazias quando não quiser limitar a condição.</p>
        <form action={createRateRule} className="adminFormGrid cols3">
          <label className="span2">Hospedagem
            <select name="accommodationId" required>
              <option value="">Selecione</option>
              {rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label>Prioridade
            <input name="priority" type="number" defaultValue="100"/>
          </label>

          <label className="span2">Nome da regra
            <input name="name" required placeholder="Ex.: Alta ocupação"/>
          </label>
          <label>Tipo de ajuste
            <select name="adjustmentType" defaultValue="PERCENT">
              <option value="PERCENT">Percentual %</option>
              <option value="FIXED">Valor fixo R$</option>
            </select>
          </label>

          <label>Ajuste
            <input name="adjustmentValue" type="number" step="0.01" required placeholder="15 ou -10"/>
          </label>
          <label>Ocupação mínima %
            <input name="minOccupancyPct" type="number" min="0" max="100"/>
          </label>
          <label>Ocupação máxima %
            <input name="maxOccupancyPct" type="number" min="0" max="100"/>
          </label>

          <label>Antecedência mín. dias
            <input name="daysBeforeMin" type="number" min="0"/>
          </label>
          <label>Antecedência máx. dias
            <input name="daysBeforeMax" type="number" min="0"/>
          </label>
          <label>Início
            <input name="startsAt" type="date"/>
          </label>

          <label>Fim
            <input name="endsAt" type="date"/>
          </label>
          <button className="span2">Criar regra dinâmica</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>ORDEM DO MOTOR</small>
        <h2>Como o preço é formado</h2>
        <div className="adminStatusLine"><span>Tarifa base</span><b>01</b></div>
        <div className="adminStatusLine"><span>Sazonalidade</span><b>02</b></div>
        <div className="adminStatusLine"><span>Regras dinâmicas</span><b>03</b></div>
        <div className="adminStatusLine"><span>Promoções / cupom</span><b>04</b></div>
        <p style={{marginTop:20}}>Regras de menor prioridade numérica são avaliadas antes das demais.</p>
      </aside>
    </section>

    {rules.length===0?<section className="adminEmptyState">
      <strong>Nenhuma regra dinâmica cadastrada.</strong>
      <p>A tarifa continuará usando apenas base, sazonalidade e promoções.</p>
    </section>:<section className="adminStack">
      {rules.map(rule=><article className="adminListCard" key={rule.id}>
        <div className="adminListCardHead">
          <div>
            <small>{rule.accommodation.name} • PRIORIDADE {rule.priority}</small>
            <h3>{rule.name}</h3>
            <p>
              Ocupação {rule.minOccupancyPct??0}%–{rule.maxOccupancyPct??100}% • 
              antecedência {rule.daysBeforeMin??0}–{rule.daysBeforeMax??"∞"} dias
            </p>
          </div>
          <strong style={{fontSize:28}}>{adjustment(rule)}</strong>
        </div>

        <div className="adminMetaRow">
          <span className={"adminChip "+(rule.active?"ok":"warn")}>{rule.active?"Ativa":"Inativa"}</span>
          <span className="adminChip">{rule.adjustmentType==="PERCENT"?"Percentual":"Valor fixo"}</span>
          {(rule.startsAt||rule.endsAt)&&<span className="adminChip">
            {rule.startsAt?rule.startsAt.toLocaleDateString("pt-BR"):"Sempre"} → {rule.endsAt?rule.endsAt.toLocaleDateString("pt-BR"):"Sem fim"}
          </span>}
        </div>

        <div className="adminInlineActions">
          <form action={deleteRateRule}>
            <input type="hidden" name="id" value={rule.id}/>
            <button className="danger">Excluir regra</button>
          </form>
        </div>
      </article>)}
    </section>}
  </main>;
}
