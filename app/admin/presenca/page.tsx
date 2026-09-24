import {prisma} from "../../../lib/prisma";
import {requireSuperAdmin} from "../../../lib/admin-auth";
export const dynamic="force-dynamic";
export default async function PresencePage(){
  await requireSuperAdmin();
  const [users,logs]=await Promise.all([
    prisma.adminUser.findMany({where:{active:true},select:{id:true,username:true,role:true,onDuty:true,onDutySince:true,lastLoginAt:true},orderBy:[{onDuty:"desc"},{username:"asc"}]}),
    prisma.adminAuditLog.findMany({where:{action:{in:["STAFF_PRESENCE_STARTED","STAFF_PRESENCE_ENDED"]}},include:{actor:{select:{username:true,role:true}}},orderBy:{createdAt:"desc"},take:250})
  ]);
  const onDuty=users.filter(user=>user.onDuty);
  return <main className="adminPage">
    <section className="adminPageHero"><div><small>SUPER ADMIN / OPERAÇÃO</small><h1>Presença e turnos</h1><p>Veja quem marcou atendimento ativo agora e o histórico de entradas e saídas registrado pelo sistema.</p></div></section>
    <section className="adminMetricStrip"><div><small>Usuários ativos</small><strong>{users.length}</strong></div><div><small>Em atendimento</small><strong>{onDuty.length}</strong></div><div><small>Fora de atendimento</small><strong>{users.length-onDuty.length}</strong></div><div><small>Registros exibidos</small><strong>{logs.length}</strong></div></section>
    <section className="adminTwoCol">
      <article className="adminSectionCard"><h2>Agora</h2><p>Status operacional informado por cada usuário no topo do Command Center.</p><div className="adminStack">{users.map(user=><div className="adminStatusLine" key={user.id}><span><b>{user.username}</b><br/><small>{user.role}{user.lastLoginAt?" • login "+user.lastLoginAt.toLocaleString("pt-BR"):""}</small></span><b className={"adminChip "+(user.onDuty?"ok":"warn")}>{user.onDuty?"ATIVO desde "+(user.onDutySince?.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})||"—"):"FORA"}</b></div>)}</div></article>
      <article className="adminSectionCard"><h2>Histórico de presença</h2><p>Entrada e saída ficam registradas no audit log do Super Admin, inclusive saída automática ao fazer logout.</p>{logs.length===0?<div className="adminPageNote">Ainda não há registros de presença.</div>:<div className="adminStack">{logs.map(log=>{const details=(log.details||{}) as Record<string,unknown>;const duration=typeof details.durationMinutes==="number"?details.durationMinutes:null;return <div className="adminStatusLine" key={log.id} style={{alignItems:"flex-start"}}><span><b>{log.actor?.username||"Usuário removido"}</b><br/><small>{log.action==="STAFF_PRESENCE_STARTED"?"Iniciou atendimento":"Encerrou atendimento"} • {log.createdAt.toLocaleString("pt-BR")}</small>{duration!=null&&<><br/><small>Duração: {duration} min • saída {String(details.reason||"MANUAL")}</small></>}</span><span className={"adminChip "+(log.action==="STAFF_PRESENCE_STARTED"?"ok":"")}>{log.actor?.role||"—"}</span></div>})}</div>}</article>
    </section>
  </main>;
}
