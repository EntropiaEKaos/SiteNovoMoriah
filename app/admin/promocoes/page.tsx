import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createPromotion,togglePromotion,deletePromotion} from "../actions";

export const dynamic="force-dynamic";
const money=(v:number|null,t:string|null)=>v==null?"Institucional":t==="FIXED"?(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):v+"%";

export default async function Page(){
  await requireAdmin();
  const [rows,rooms]=await Promise.all([
    prisma.promotion.findMany({orderBy:{createdAt:"desc"}}),
    prisma.accommodation.findMany({where:{active:true},orderBy:{name:"asc"}})
  ]);
  const active=rows.filter(row=>row.active).length;
  const coupon=rows.filter(row=>Boolean(row.coupon)).length;
  const stackable=rows.filter(row=>row.stackable).length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / REVENUE & MARKETING</small>
        <h1>Promoções</h1>
        <p>Campanhas que entram diretamente na cotação oficial. Use cupons, estadia mínima e segmentação por hospedagem sem alterar a tarifa base.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/admin/tarifas">Tarifas →</a>
        <a className="adminSecondaryAction" href="/reservar">Ver cotação ↗</a>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Campanhas</small><strong>{rows.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Com cupom</small><strong>{coupon}</strong></div>
      <div><small>Combináveis</small><strong>{stackable}</strong></div>
    </section>

    <section className="adminSectionCard isDark" style={{marginBottom:20}}>
      <small>NOVA CAMPANHA</small>
      <h2>Crie uma promoção calculável</h2>
      <p>O desconto é revalidado pelo servidor no momento da cotação.</p>
      <form action={createPromotion} className="adminFormGrid cols3" data-feedback-success="Promoção criada com sucesso.">
        <label>Título<input name="title" required placeholder="Nome da campanha"/></label>
        <label>Cupom<input name="coupon" placeholder="Opcional"/></label>
        <label>Tipo
          <select name="discountType" required>
            <option value="PERCENT">Desconto %</option>
            <option value="FIXED">Desconto R$</option>
          </select>
        </label>
        <label>Valor<input name="discountValue" type="number" step=".01" min=".01" required/></label>
        <label>Mínimo de noites<input name="minNights" type="number" min="1"/></label>
        <label>Hospedagem
          <select name="accommodationId">
            <option value="">Todas</option>
            {rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
        <label className="span2">Descrição<input name="description" placeholder="Descrição comercial"/></label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <input name="stackable" type="checkbox"/> Permitir combinar
        </label>
        <button className="span2">Criar promoção</button>
      </form>
    </section>

    {rows.length===0?<section className="adminEmptyState">
      <strong>Nenhuma promoção cadastrada.</strong>
      <p>Crie a primeira campanha usando o formulário acima.</p>
    </section>:<section className="adminStack">
      {rows.map(promo=><article className="adminListCard" key={promo.id}>
        <div className="adminListCardHead">
          <div>
            <small>{promo.coupon?"CUPOM "+promo.coupon:"CAMPANHA AUTOMÁTICA"}</small>
            <h3>{promo.title}</h3>
            <p>{promo.description||"Campanha comercial Moriah."}</p>
          </div>
          <strong style={{fontSize:28}}>{money(promo.discountValue,promo.discountType)} OFF</strong>
        </div>

        <div className="adminMetaRow">
          <span className={"adminChip "+(promo.active?"ok":"warn")}>{promo.active?"Ativa":"Pausada"}</span>
          {promo.minNights&&<span className="adminChip">Mín. {promo.minNights} noites</span>}
          <span className="adminChip">{promo.stackable?"Combinável":"Não combinável"}</span>
        </div>

        <div className="adminInlineActions">
          <form action={togglePromotion} data-feedback-success="Status da promoção atualizado.">
            <input type="hidden" name="id" value={promo.id}/>
            <button>{promo.active?"Pausar":"Ativar"}</button>
          </form>
          <form action={deletePromotion} data-feedback-success="Promoção excluída.">
            <input type="hidden" name="id" value={promo.id}/>
            <button className="danger">Excluir</button>
          </form>
        </div>
      </article>)}
    </section>}
  </main>;
}
