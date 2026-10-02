import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {redeemRouletteSpin} from "../actions";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}){
  await requireAdmin();
  const {code=""}=await searchParams;
  const claimCode=String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,24);
  const spin=claimCode?await prisma.rouletteSpin.findUnique({where:{claimCode},include:{entry:true,prize:true}}):null;
  const expired=Boolean(spin?.expiresAt&&spin.expiresAt<new Date()&&!spin.redeemedAt);
  return <main className="adminPage">
    <section className="adminPageHero"><div><small>MORIAH / ROLETA 4.0</small><h1>Resgate rápido</h1><p>Consulte e valide um prêmio pelo código. O telefone não faz parte do link nem do QR.</p></div><Link className="adminSecondaryAction" href="/admin/roleta">Voltar à roleta</Link></section>
    <section className="adminSectionCard">
      <form method="get" className="adminFormGrid">
        <label className="span2">Código de retirada<input name="code" defaultValue={claimCode} placeholder="Ex.: A1B2C3D4E5F6" autoComplete="off"/></label>
        <button className="span2">Consultar prêmio</button>
      </form>
      {claimCode&&!spin&&<div className="adminPageNote"><strong>Código não encontrado.</strong><p>Confira o código apresentado pelo cliente.</p></div>}
      {spin&&<div className="adminStack" style={{marginTop:18}}>
        <div className="adminPageNote"><strong>{spin.prize.name}</strong><p>Cliente: {spin.entry.name} • Campanha: {spin.entry.campaignKey}</p><p>Código: <b>{spin.claimCode}</b></p><p>Status: {spin.redeemedAt?"ENTREGUE":expired?"EXPIRADO":"VÁLIDO PARA RESGATE"}</p></div>
        {!spin.redeemedAt&&!expired&&<form action={redeemRouletteSpin}><input type="hidden" name="id" value={spin.id}/><button>Confirmar entrega do prêmio</button></form>}
        {spin.redeemedAt&&<p>Entregue em {spin.redeemedAt.toLocaleString("pt-BR")} por {spin.redeemedBy||"equipe"}.</p>}
      </div>}
    </section>
  </main>;
}
