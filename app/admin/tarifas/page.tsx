import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createRatePlan,deleteRatePlan,createRateOverride,deleteRateOverride} from "../actions";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();
  const [plans,rooms]=await Promise.all([
    prisma.ratePlan.findMany({
      include:{accommodation:true,overrides:{orderBy:{startsAt:"asc"}}},
      orderBy:{createdAt:"desc"}
    }),
    prisma.accommodation.findMany({where:{active:true},orderBy:{name:"asc"}})
  ]);

  const overrides=plans.reduce((sum,plan)=>sum+plan.overrides.length,0);
  const average=plans.length?Math.round(plans.reduce((sum,plan)=>sum+plan.basePriceCents,0)/plans.length):0;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / REVENUE</small>
        <h1>Tarifas</h1>
        <p>Planos de diária, estadia mínima e períodos sazonais usados pela cotação pública e pelo motor de receita.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/admin/preco-dinamico">Preço dinâmico →</a>
        <a className="adminSecondaryAction" href="/admin/promocoes">Promoções →</a>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Planos</small><strong>{plans.length}</strong></div>
      <div><small>Acomodações ativas</small><strong>{rooms.length}</strong></div>
      <div><small>Ajustes sazonais</small><strong>{overrides}</strong></div>
      <div><small>Diária média base</small><strong style={{fontSize:20}}>{(average/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Novo plano tarifário</h2>
        <p>Crie a tarifa base que será usada nas cotações.</p>
        <form action={createRatePlan} className="adminFormGrid">
          <label className="span2">Hospedagem
            <select name="accommodationId" required>
              <option value="">Selecione</option>
              {rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label>Nome da tarifa
            <input name="name" required placeholder="Ex.: Tarifa padrão"/>
          </label>
          <label>Diária
            <input name="basePrice" required inputMode="decimal" placeholder="R$"/>
          </label>
          <label>Mínimo de noites
            <input name="minNights" type="number" min="1" defaultValue="1"/>
          </label>
          <label>Máximo de noites
            <input name="maxNights" type="number" min="1" placeholder="Opcional"/>
          </label>
          <button className="span2">Criar tarifa</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>MOTOR DE RECEITA</small>
        <h2>Como a cotação usa isso?</h2>
        <div className="adminStatusLine"><span>Tarifa base</span><b>1º</b></div>
        <div className="adminStatusLine"><span>Ajuste sazonal</span><b>2º</b></div>
        <div className="adminStatusLine"><span>Preço dinâmico</span><b>3º</b></div>
        <div className="adminStatusLine"><span>Promoção / cupom</span><b>4º</b></div>
        <p style={{marginTop:20}}>O site consulta esse motor antes de exibir o valor ao hóspede.</p>
      </aside>
    </section>

    <section className="adminStack" style={{marginTop:20}}>
      {plans.length===0?<div className="adminEmptyState">
        <strong>Nenhuma tarifa cadastrada.</strong>
        <p>Crie o primeiro plano para começar a cotação automática.</p>
      </div>:plans.map(plan=><article className="adminListCard" key={plan.id}>
        <div className="adminListCardHead">
          <div>
            <small>{plan.accommodation.name}</small>
            <h3>{plan.name}</h3>
            <p>{(plan.basePriceCents/100).toLocaleString("pt-BR",{style:"currency",currency:plan.currency})} / noite • mínimo {plan.minNights} noite(s)</p>
          </div>
          <span className="adminChip ok">{plan.overrides.length} ajuste(s)</span>
        </div>

        <form action={createRateOverride} className="adminFormGrid cols3" style={{marginTop:18,paddingTop:18,borderTop:"1px solid #ece7dc"}}>
          <input type="hidden" name="ratePlanId" value={plan.id}/>
          <label>Início<input name="startsAt" type="date" required/></label>
          <label>Fim<input name="endsAt" type="date" required/></label>
          <label>Diária<input name="price" inputMode="decimal" required placeholder="R$"/></label>
          <label>Mín. noites<input name="minNights" type="number" min="1"/></label>
          <label style={{display:"flex",alignItems:"center",gap:8}}><input name="closedToArrival" type="checkbox"/> Fechar chegada</label>
          <label style={{display:"flex",alignItems:"center",gap:8}}><input name="closedToDeparture" type="checkbox"/> Fechar saída</label>
          <button className="span2">Adicionar período</button>
        </form>

        {plan.overrides.map(override=><div className="adminStatusLine" key={override.id}>
          <span>{override.startsAt.toLocaleDateString("pt-BR")} → {override.endsAt.toLocaleDateString("pt-BR")} • {(override.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:plan.currency})}</span>
          <form action={deleteRateOverride}>
            <input type="hidden" name="id" value={override.id}/>
            <button>Remover</button>
          </form>
        </div>)}

        <div className="adminInlineActions">
          <form action={deleteRatePlan}>
            <input type="hidden" name="id" value={plan.id}/>
            <button className="danger">Excluir tarifa</button>
          </form>
        </div>
      </article>)}
    </section>
  </main>;
}
