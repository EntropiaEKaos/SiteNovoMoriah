import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createRoulettePrize,redeemRouletteSpin,saveRouletteSettings,toggleRoulettePrize,updateRoulettePrize} from "./actions";

export const dynamic="force-dynamic";

function localInput(date:Date|null){
  if(!date)return "";
  const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60_000);
  return shifted.toISOString().slice(0,16);
}

export default async function RouletteAdmin(){
  await requireAdmin();
  const now=new Date();
  const [settings,prizes,spins,total,todayCount,redeemed]=await Promise.all([
    prisma.rouletteSettings.findUnique({where:{id:"main"}}),
    prisma.roulettePrize.findMany({orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}),
    prisma.rouletteSpin.findMany({include:{entry:true,prize:true},orderBy:{createdAt:"desc"},take:100}),
    prisma.rouletteSpin.count(),
    prisma.rouletteSpin.count({where:{createdAt:{gte:new Date(new Date().setHours(0,0,0,0))}}}),
    prisma.rouletteSpin.count({where:{redeemedAt:{not:null}}})
  ]);

  const s=settings||{
    active:false,campaignKey:"moriah-1",title:"Roleta da Sorte Moriah",subtitle:"Cadastre-se e descubra seu prêmio.",
    introText:"Sua participação é independente de avaliações. Se quiser, compartilhe sua experiência no Google.",
    googleReviewUrl:null,googleReviewLabel:"Avaliar a Moriah no Google",
    termsText:"Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.",
    activeFrom:null,activeUntil:null
  };

  return <main className="adminPage">
    <section className="adminPageHero">
      <div><small>MORIAH / ENGAJAMENTO</small><h1>Roleta da Sorte</h1><p>Campanha visual em PixiJS com prêmios, estoque, chances, participação única por telefone e auditoria de entrega.</p></div>
      <div className="adminPageHeroActions"><Link className="adminSecondaryAction" href="/et/roleta" target="_blank">Abrir roleta ↗</Link></div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Jogadas</small><strong>{total}</strong></div>
      <div><small>Hoje</small><strong>{todayCount}</strong></div>
      <div><small>Entregues</small><strong>{redeemed}</strong></div>
      <div><small>Pendentes</small><strong>{total-redeemed}</strong></div>
    </section>

    <section className="adminPageNote" style={{marginBottom:20}}>
      <strong>Avaliações do Google são opcionais.</strong> A roleta não condiciona prêmio, chance ou participação à publicação de avaliação. Isso protege o perfil da empresa contra práticas de avaliação incentivada.
    </section>

    <section className="adminTwoCol" style={{marginBottom:22}}>
      <article className="adminSectionCard">
        <h2>Campanha</h2>
        <form action={saveRouletteSettings} className="adminFormGrid">
          <label className="span2" style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="active" defaultChecked={s.active}/> Campanha ativa</label>
          <label>Identificador da campanha<input name="campaignKey" required defaultValue={s.campaignKey}/><small>Trocar este ID cria uma nova rodada de elegibilidade.</small></label>
          <label>Título<input name="title" required defaultValue={s.title}/></label>
          <label className="span2">Subtítulo<input name="subtitle" defaultValue={s.subtitle}/></label>
          <label className="span2">Texto inicial<textarea name="introText" rows={3} defaultValue={s.introText}/></label>
          <label className="span2">Link de avaliação Google<input name="googleReviewUrl" type="url" defaultValue={s.googleReviewUrl||""} placeholder="https://..."/></label>
          <label className="span2">Texto do botão Google<input name="googleReviewLabel" defaultValue={s.googleReviewLabel}/></label>
          <label>Início<input name="activeFrom" type="datetime-local" defaultValue={localInput(s.activeFrom)}/></label>
          <label>Fim<input name="activeUntil" type="datetime-local" defaultValue={localInput(s.activeUntil)}/></label>
          <label className="span2">Termos / consentimento<textarea name="termsText" rows={4} defaultValue={s.termsText}/></label>
          <button className="span2">Salvar campanha</button>
        </form>
      </article>

      <article className="adminSectionCard">
        <h2>Novo prêmio</h2>
        <form action={createRoulettePrize} className="adminFormGrid">
          <label className="span2">Nome<input name="name" required placeholder="Ex.: Refrigerante grátis"/></label>
          <label className="span2">Descrição<input name="description" placeholder="Como retirar ou usar o prêmio"/></label>
          <label>Cor<input name="color" type="color" defaultValue="#ffc845"/></label>
          <label>Cor do texto<input name="textColor" type="color" defaultValue="#1b252b"/></label>
          <label>Peso / chance<input name="weight" type="number" min="1" max="10000" defaultValue="1"/></label>
          <label>Quantidade total<input name="quantityTotal" type="number" min="1" placeholder="Vazio = ilimitado"/></label>
          <label>Validade em dias<input name="validityDays" type="number" min="1" max="365" placeholder="Vazio = sem expiração"/></label>
          <label>Ordem<input name="sortOrder" type="number" min="0" defaultValue="100"/></label>
          <label className="span2" style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="active" defaultChecked/> Prêmio ativo</label>
          <button className="span2">Adicionar prêmio</button>
        </form>
      </article>
    </section>

    <section className="adminSectionCard" style={{marginBottom:22}}>
      <h2>Prêmios da roleta</h2>
      {prizes.length===0?<p>Cadastre ao menos um prêmio antes de ativar a campanha.</p>:<div className="adminStack">
        {prizes.map(prize=><details key={prize.id} className="adminPageNote">
          <summary><strong>{prize.name}</strong> • peso {prize.weight} • sorteados {prize.awardedCount}{prize.quantityTotal!==null?" / "+prize.quantityTotal:" / ∞"} • {prize.active?"ATIVO":"PAUSADO"}</summary>
          <form action={updateRoulettePrize} className="adminFormGrid" style={{marginTop:14}}>
            <input type="hidden" name="id" value={prize.id}/>
            <label className="span2">Nome<input name="name" required defaultValue={prize.name}/></label>
            <label className="span2">Descrição<input name="description" defaultValue={prize.description||""}/></label>
            <label>Cor<input name="color" type="color" defaultValue={prize.color}/></label>
            <label>Cor do texto<input name="textColor" type="color" defaultValue={prize.textColor}/></label>
            <label>Peso<input name="weight" type="number" min="1" max="10000" defaultValue={prize.weight}/></label>
            <label>Quantidade<input name="quantityTotal" type="number" min={Math.max(1,prize.awardedCount)} defaultValue={prize.quantityTotal??""}/></label>
            <label>Validade (dias)<input name="validityDays" type="number" min="1" max="365" defaultValue={prize.validityDays??""}/></label>
            <label>Ordem<input name="sortOrder" type="number" min="0" defaultValue={prize.sortOrder}/></label>
            <label className="span2" style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="active" defaultChecked={prize.active}/> Ativo</label>
            <button className="span2">Salvar prêmio</button>
          </form>
          <form action={toggleRoulettePrize} style={{marginTop:8}}><input type="hidden" name="id" value={prize.id}/><button>{prize.active?"Pausar prêmio":"Reativar prêmio"}</button></form>
        </details>)}
      </div>}
    </section>

    <section className="adminSectionCard">
      <h2>Auditoria das últimas jogadas</h2>
      {spins.length===0?<p>Ainda não há participações.</p>:<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th>Data</th><th>Cliente</th><th>Telefone</th><th>Prêmio</th><th>Código</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>{spins.map(spin=>{
            const expired=Boolean(spin.expiresAt&&spin.expiresAt<now&&!spin.redeemedAt);
            return <tr key={spin.id}>
              <td>{spin.createdAt.toLocaleString("pt-BR")}</td>
              <td>{spin.entry.name}</td>
              <td>+{spin.entry.phone}</td>
              <td>{spin.prize.name}</td>
              <td><strong>{spin.claimCode}</strong></td>
              <td>{spin.redeemedAt?"ENTREGUE":expired?"EXPIRADO":"PENDENTE"}</td>
              <td>{!spin.redeemedAt&&!expired?<form action={redeemRouletteSpin}><input type="hidden" name="id" value={spin.id}/><button>Marcar entregue</button></form>:spin.redeemedBy||"—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </main>;
}
