import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createChannelIntegration,toggleChannelIntegration,deleteChannelIntegration,syncChannelNow} from "../actions";
import {listChannelAdapterCapabilities} from "../../../lib/channel-adapter-registry";
export const dynamic="force-dynamic";
const labels:Record<string,string>={AIRBNB:"Airbnb",BOOKING:"Booking.com",ICAL:"Outro iCal/ICS"};
function health(x:{active:boolean;lastSyncAt:Date|null;lastError:string|null}){if(!x.active)return ["Pausado","#777"];if(x.lastError)return ["Atenção","#b42318"];if(x.lastSyncAt)return ["Sincronizado","#067647"];return ["Aguardando sync","#b54708"];}
export default async function Page(){
 await requireAdmin();
 const [rows,rooms,blocks]=await Promise.all([
  prisma.channelIntegration.findMany({include:{accommodation:true,_count:{select:{blocks:true}}},orderBy:{createdAt:"desc"}}),
  prisma.accommodation.findMany({where:{active:true},orderBy:{name:"asc"}}),
  prisma.channelBlock.count()
 ]);
 const active=rows.filter(x=>x.active).length, errors=rows.filter(x=>x.lastError).length;
 const adapters=listChannelAdapterCapabilities();
 return <main style={{padding:"50px 6vw",maxWidth:1180,margin:"0 auto"}}>
  <small>MORIAH CMS / INVENTORY ENGINE</small><h1 style={{fontSize:48,marginBottom:8}}>Central de Canais 2.0</h1>
  <p>O iCal continua ativo como primeiro adapter do inventário central. Conectores oficiais poderão entrar depois sem substituir os calendários existentes.</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,margin:"28px 0"}}>
   {[["Conexões",rows.length],["Ativas",active],["Bloqueios importados",blocks],["Com atenção",errors]].map(([k,v])=><div key={String(k)} style={{border:"1px solid #ddd",borderRadius:14,padding:18}}><small>{k}</small><div style={{fontSize:30,fontWeight:900}}>{v}</div></div>)}
  </div>
  <p><a href="/admin/canais/calendario">Abrir calendário unificado →</a></p>
  <section style={{margin:"28px 0"}}><h2>Adapters do inventário</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>{adapters.map(a=><div key={a.kind} style={{border:"1px solid #ddd",borderRadius:12,padding:14}}><b>{a.label}</b><p style={{margin:"8px 0",fontWeight:800,color:a.implemented?"#067647":"#777"}}>{a.implemented?"Disponível":"Preparado / não conectado"}</p><small>{a.supportsImport?"Importa disponibilidade":"Importação pendente"} • {a.supportsExport?"Exporta calendário":"Exportação pendente"}{a.supportsRates?" • Tarifas":""}{a.supportsReservations?" • Reservas":""}</small></div>)}</div></section>
  <form action={createChannelIntegration} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,margin:"30px 0",padding:20,border:"1px solid #ddd",borderRadius:14}}>
   <select name="provider" required style={{padding:14}}><option value="AIRBNB">Airbnb via iCal</option><option value="BOOKING">Booking.com via iCal</option><option value="ICAL">Outro iCal/ICS</option></select>
   <input name="name" required placeholder="Nome da conexão" style={{padding:14}}/>
   <select name="accommodationId" required style={{padding:14,gridColumn:"1/-1"}}><option value="">Hospedagem vinculada</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
   <input name="importUrl" type="url" required placeholder="URL HTTPS do calendário iCal/ICS" style={{padding:14,gridColumn:"1/-1"}}/>
   <button style={{background:"#ffd400",border:0,padding:15,fontWeight:800,borderRadius:10}}>Adicionar adapter iCal</button>
  </form>
  <div style={{display:"grid",gap:12}}>{rows.map(x=>{const [status,color]=health(x);return <article key={x.id} style={{border:"1px solid #ddd",padding:20,borderRadius:14}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"start",flexWrap:"wrap"}}><div><b style={{fontSize:19}}>{x.name}</b><p style={{margin:"6px 0"}}>{labels[x.provider]||x.provider} • {x.integrationType==="ICAL"?"iCal/ICS":x.integrationType.replaceAll("_"," ")} • {x.accommodation?.name||"Sem hospedagem"}</p></div><b style={{color}}>{status}</b></div>
   <small>{x._count.blocks} bloqueio(s) • {x.lastSyncAt?"Última sincronização: "+x.lastSyncAt.toLocaleString("pt-BR"):"Ainda não sincronizado"}</small>
   {x.lastError?<p style={{color:"#b42318"}}>Último erro: {x.lastError}</p>:null}
   <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><form action={syncChannelNow}><input type="hidden" name="id" value={x.id}/><button>Sincronizar agora</button></form><form action={toggleChannelIntegration}><input type="hidden" name="id" value={x.id}/><button>{x.active?"Pausar":"Ativar"}</button></form><form action={deleteChannelIntegration}><input type="hidden" name="id" value={x.id}/><button>Excluir</button></form></div>
  </article>})}</div>
 </main>
}