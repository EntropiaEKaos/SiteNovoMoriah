import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { getAdminOccupancyPreview } from "../../../lib/admin-occupancy-preview";

export const dynamic = "force-dynamic";

export default async function OccupancyPreviewPage() {
  await requireAdmin();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const rooms = await prisma.accommodation.findMany({
    where: { active: true },
    select: { id: true, name: true, sharedRoom: true, bedCount: true },
    orderBy: { name: "asc" },
  });
  const asOf = new Date();
  const previews = await Promise.allSettled(rooms.map((room) =>
    getAdminOccupancyPreview({ accommodationId: room.id, start: today, days: 14, asOf })));
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
                return <td key={date} title={item ? `Não certificado · ${item.used}/${item.capacity} unidades registradas` : "Falha de leitura"} style={{
                  textAlign:"center",padding:8,borderBottom:"1px solid #ddd",
                  background:item?"#fff4d6":"#fee2e2",color:"#6b4e00",
                }}>{item ? "?" : "!"}</td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p style={{fontSize:12,marginTop:12}}> ? Não verificado · ! Falha de leitura. Passe o mouse sobre a célula para consultar a contagem preliminar. Não utilize para autorizar novas reservas.</p>
    </section>
  </main>;
}
