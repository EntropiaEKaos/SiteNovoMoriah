import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createGuest} from "./actions";

export const dynamic="force-dynamic";

export default async function GuestsPage({
  searchParams
}:{
  searchParams:Promise<{q?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const q=String(params.q||"").trim();

  const where=q?{
    OR:[
      {name:{contains:q,mode:"insensitive" as const}},
      {phone:{contains:q,mode:"insensitive" as const}},
      {email:{contains:q,mode:"insensitive" as const}},
      {document:{contains:q,mode:"insensitive" as const}}
    ]
  }:undefined;

  const [guests,total,withBookings]=await Promise.all([
    prisma.guest.findMany({
      where,
      include:{_count:{select:{bookings:true}}},
      orderBy:{updatedAt:"desc"},
      take:100
    }),
    prisma.guest.count(),
    prisma.guest.count({where:{bookings:{some:{}}}})
  ]);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / CRM</small>
        <h1>Hóspedes</h1>
        <p>Cadastre hóspedes, mantenha dados de contato organizados e consulte o histórico de reservas vinculadas.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/reservas">Reservas →</Link>
        <Link className="adminSecondaryAction" href="/admin/pms">PMS →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Cadastros</small><strong>{total}</strong></div>
      <div><small>Com histórico</small><strong>{withBookings}</strong></div>
      <div><small>Exibidos</small><strong>{guests.length}</strong></div>
      <div><small>Base</small><strong style={{fontSize:18}}>PMS / CRM</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Novo hóspede</h2>
        <p>Nome e telefone/WhatsApp são obrigatórios. Documento e e-mail ajudam a evitar cadastros duplicados.</p>
        <form action={createGuest} className="adminFormGrid">
          <label className="span2">Nome completo
            <input name="name" required maxLength={160} autoComplete="name"/>
          </label>
          <label>Telefone / WhatsApp
            <input name="phone" required maxLength={60} autoComplete="tel"/>
          </label>
          <label>E-mail
            <input name="email" type="email" maxLength={200} autoComplete="email"/>
          </label>
          <label className="span2">CPF / Passaporte / Documento
            <input name="document" maxLength={100}/>
          </label>
          <label className="span2">Observações
            <textarea name="notes" maxLength={4000} rows={4} placeholder="Preferências, necessidades de acessibilidade, observações operacionais..."/>
          </label>
          <button className="span2">Cadastrar hóspede</button>
        </form>
      </article>

      <aside className="adminSectionCard">
        <h2>Buscar cadastro</h2>
        <p>Pesquise por nome, telefone, e-mail ou documento.</p>
        <form method="get" className="adminFormGrid">
          <label className="span2">Busca
            <input name="q" defaultValue={q} placeholder="Digite para localizar"/>
          </label>
          <button className="span2">Buscar</button>
        </form>
        {q&&<div className="adminPageNote" style={{marginTop:16}}>
          Resultado para <b>{q}</b>. <Link href="/admin/hospedes">Limpar busca</Link>
        </div>}
      </aside>
    </section>

    {guests.length===0?<section className="adminEmptyState">
      <strong>{q?"Nenhum hóspede encontrado.":"Nenhum hóspede cadastrado."}</strong>
      <p>{q?"Tente outro nome, telefone, e-mail ou documento.":"Use o formulário acima para criar o primeiro cadastro."}</p>
    </section>:<section className="adminStack">
      {guests.map(guest=><article className="adminListCard" key={guest.id}>
        <div className="adminListCardHead">
          <div>
            <small>HÓSPEDE</small>
            <h3>{guest.name}</h3>
            <p>{guest.phone}{guest.email?" • "+guest.email:""}</p>
          </div>
          <span className={"adminChip "+(guest._count.bookings?"ok":"")}>{guest._count.bookings} reserva(s)</span>
        </div>
        <div className="adminMetaRow">
          {guest.document&&<span className="adminChip">{guest.document}</span>}
          <span className="adminChip">Atualizado {guest.updatedAt.toLocaleDateString("pt-BR")}</span>
        </div>
        <div className="adminInlineActions">
          <Link className="highlight" href={"/admin/hospedes/"+guest.id}>Abrir ficha →</Link>
        </div>
      </article>)}
    </section>}
  </main>;
}
