import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { getAdminOccupancyPreview } from "../../../lib/admin-occupancy-preview";

export const dynamic = "force-dynamic";

export default async function OccupancyPreviewPage() {
  await requireAdmin();
  const asOf = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(asOf);
  const rooms = await prisma.accommodation.findMany({
    where: { active: true },
    select: { id: true, name: true, sharedRoom: true, bedCount: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  // Bounded concurrency avoids flooding the database with per-room reads.
  const previews: PromiseSettledResult<Awaited<ReturnType<typeof getAdminOccupancyPreview>>>[] = [];
  for (let offset = 0; offset < rooms.length; offset += 5) {
    const batch = rooms.slice(offset, offset + 5);
    previews.push(...await Promise.allSettled(batch.map((room) =>
      getAdminOccupancyPreview({ accommodationId: room.id, start: today, days: 14, asOf }))));
  }
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / CALENDÁRIO 3.1</small>
        <h1>Prévia de ocupação</h1>
        <p>Diagnóstico de leitura, sem alteração de reservas, bloqueios ou tarifas.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/preco-dinamico">Calendário de preços →</Link>
      </div>
    </section>
    <section className="adminSectionCard">
      <h2>Próximos 14 dias</h2>
      <p style={{fontSize:12}}>Exibindo até 100 hospedagens ativas nesta prévia administrativa. Consultas executadas em lotes de cinco.</p>
      {rooms.length === 0 && <p role="status">Nenhuma hospedagem ativa encontrada.</p>}
      <p role="status" style={{fontWeight:700}}>
        ⚠ Dados não certificados: esta grade NÃO comprova disponibilidade para venda.
        A reconciliação com canais e o fuso horário da pousada ainda estão pendentes.
      </p>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",minWidth:1100,width:"100%",fontSize:12}}>
          <thead><tr>
            <th scope="col" style={{position:"sticky",left:0,background:"#f5f3ed",padding:12,textAlign:"left"}}>Hospedagem</th>
            {dates.map(date=><th scope="col" key={date} style={{padding:8,background:"#f5f3ed"}}>{date.slice(8,10)}/{date.slice(5,7)}</th>)}
          </tr></thead>
          <tbody>{rooms.map((room,index)=>{
            const result = previews[index];
            const days = result.status === "fulfilled" ? result.value : null;
            return <tr key={room.id}>
              <th scope="row" style={{position:"sticky",left:0,background:"#fff",padding:12,textAlign:"left",borderBottom:"1px solid #ddd"}}>
                {room.name}<small style={{display:"block",fontWeight:400}}>{room.sharedRoom ? room.bedCount+" camas" : "Quarto privativo"}</small>
              </th>
              {dates.map((date,dayIndex)=>{
                const item=days?.[dayIndex];
                return <td key={date} aria-label={item ? `${room.name}, ${date}: dados não verificados, ${item.used} de ${item.capacity} unidades preliminares` : `${room.name}, ${date}: falha de leitura`} title={item ? `Não certificado · ${item.used}/${item.capacity} unidades registradas` : "Falha de leitura"} style={{
                  textAlign:"center",padding:8,borderBottom:"1px solid #ddd",
                  background:item?"#fff4d6":"#fee2e2",color:"#6b4e00",
                }}>{item ? <span style={{fontWeight:700}}>{item.used}/{item.capacity}<small style={{display:"block"}}>Não verificado</small></span> : <span>Falha</span>}</td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p style={{fontSize:12,marginTop:12}}> Os números representam contagens preliminares, não disponibilidade confirmada. Células com falha não possuem contagem confiável. Não utilize para autorizar novas reservas.</p>
    </section>
  </main>;
}
