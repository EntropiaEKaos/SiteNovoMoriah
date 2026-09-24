import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {createGuest} from "./actions";

export const dynamic="force-dynamic";

export default async function GuestsPage({
  searchParams
}:{
  searchParams:Promise<{q?:string;type?:string}>
}){
  await requireAdmin();
  const params=await searchParams;
  const q=String(params.q||"").trim();
  const type=String(params.type||"").trim().toUpperCase();

  const where={
    ...(type==="MONTHLY"?{monthlyGuest:true}:{}),
    ...(type==="EMPLOYEE"?{employee:true}:{}),
    ...(q?{
      OR:[
        {name:{contains:q,mode:"insensitive" as const}},
        {phone:{contains:q,mode:"insensitive" as const}},
        {email:{contains:q,mode:"insensitive" as const}},
        {document:{contains:q,mode:"insensitive" as const}}
      ]
    }:{})
  };

  const [guests,total,monthlyGuests,employees]=await Promise.all([
    prisma.guest.findMany({
      where,
      include:{_count:{select:{bookings:true}}},
      orderBy:{updatedAt:"desc"},
      take:100
    }),
    prisma.guest.count(),
    prisma.guest.count({where:{monthlyGuest:true}}),
    prisma.guest.count({where:{employee:true}})
  ]);

  let staffSchemaReady=true;
  let staffPositions:Array<{id:string;name:string;description:string|null}>=[];
  let staffAssignments:Array<{guestId:string;position:{name:string}}>=[];

  try{
    [staffPositions,staffAssignments]=await Promise.all([
      prisma.staffPosition.findMany({
        where:{active:true},
        orderBy:[{sortOrder:"asc"},{name:"asc"}],
        select:{id:true,name:true,description:true}
      }),
      guests.length
        ?prisma.staffAssignment.findMany({
            where:{guestId:{in:guests.map(guest=>guest.id)}},
            select:{guestId:true,position:{select:{name:true}}}
          })
        :Promise.resolve([])
    ]);
  }catch(error){
    staffSchemaReady=false;
    console.error("STAFF_POSITION_SCHEMA_PENDING",error);
  }

  const positionByGuest=new Map(staffAssignments.map(item=>[item.guestId,item.position.name]));

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / CRM 2.0</small>
        <h1>Hóspedes</h1>
        <p>Cadastro completo, preferências, documentos, contatos, histórico de estadias e contexto operacional em uma única ficha.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/reservas">Reservas →</Link>
        <Link className="adminSecondaryAction" href="/admin/pms">PMS →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Cadastros</small><strong>{total}</strong></div>
      <div><small>Mensalistas</small><strong>{monthlyGuests}</strong></div>
      <div><small>Colaboradores</small><strong>{employees}</strong></div>
      <div><small>Exibidos</small><strong>{guests.length}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Novo hóspede</h2>
        <p>Nome e telefone são obrigatórios. Os demais dados enriquecem o CRM e agilizam o atendimento futuro.</p>
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
          <label>Tipo de documento
            <select name="documentType" defaultValue="CPF">
              <option value="CPF">CPF</option>
              <option value="RG">RG</option>
              <option value="PASSAPORTE">Passaporte</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          <label>Documento
            <input name="document" maxLength={100}/>
          </label>
          <label>Data de nascimento
            <input name="birthDate" type="date"/>
          </label>
          <label>Nacionalidade
            <input name="nationality" maxLength={100} placeholder="Brasil"/>
          </label>
          <label className="span2">Endereço
            <input name="address" maxLength={240} autoComplete="street-address"/>
          </label>
          <label>Cidade
            <input name="city" maxLength={120}/>
          </label>
          <label>Estado
            <input name="state" maxLength={80}/>
          </label>
          <label>CEP
            <input name="postalCode" maxLength={30} autoComplete="postal-code"/>
          </label>
          <label>Contato de emergência
            <input name="emergencyContact" maxLength={300} placeholder="Nome e telefone"/>
          </label>
          <label>Próximo pagamento do mensalista
            <input name="monthlyPaymentDueAt" type="date"/>
            <small>Preencha quando o cadastro for mensalista. A central avisará os admins na data.</small>
          </label>
          <label>Categoria / cargo do colaborador
            <select name="employeePositionId" disabled={!staffSchemaReady||staffPositions.length===0} defaultValue="">
              <option value="">Selecione o cargo</option>
              {staffPositions.map(position=><option value={position.id} key={position.id}>{position.name}</option>)}
            </select>
            <small>{staffSchemaReady
              ?staffPositions.length
                ?"Usado quando o cadastro estiver marcado como colaborador."
                :"Crie primeiro um cargo em Colaboradores → Cargos."
              :"Cargos aguardam a migration do banco."}</small>
          </label>
          <div className="span2 guestMarkerGrid">
            <label className="guestMarkerOption">
              <input name="monthlyGuest" type="checkbox"/>
              <span><b>Mensalista</b><small>Pode existir no CRM sem reserva ou hospedagem vinculada.</small></span>
            </label>
            <label className="guestMarkerOption">
              <input name="employee" type="checkbox"/>
              <span><b>Colaborador</b><small>Cadastro operacional independente de hospedagem.</small></span>
            </label>
          </div>
          <label className="span2">Preferências
            <textarea name="preferences" maxLength={4000} rows={3} placeholder="Ex.: quarto térreo, travesseiro extra, restrições alimentares..."/>
          </label>
          <label className="span2">Observações internas
            <textarea name="notes" maxLength={4000} rows={3}/>
          </label>
          <button className="span2">Cadastrar hóspede</button>
        </form>
      </article>

      <aside className="adminSectionCard">
        <h2>Buscar cadastro</h2>
        <p>Pesquise por nome, telefone, e-mail ou documento. Cadastros com mesmo documento ou nome + telefone são reaproveitados.</p>
        <form method="get" className="adminFormGrid">
          <label>Busca
            <input name="q" defaultValue={q} placeholder="Digite para localizar"/>
          </label>
          <label>Tipo
            <select name="type" defaultValue={type}>
              <option value="">Todos os cadastros</option>
              <option value="MONTHLY">Mensalistas</option>
              <option value="EMPLOYEE">Colaboradores</option>
            </select>
          </label>
          <button className="span2">Buscar</button>
        </form>
        {(q||type)&&<div className="adminPageNote" style={{marginTop:16}}>
          Filtro ativo{q?<> para <b>{q}</b></>:""}. <Link href="/admin/hospedes">Limpar busca</Link>
        </div>}
        <div className="adminPageNote" style={{marginTop:16}}>
          <b>Cargos de colaboradores</b><br/>
          Crie categorias como Recepção, Cozinha, Limpeza, Manutenção ou Gerência com uma descrição operacional própria.{" "}
          <Link href="/admin/colaboradores/cargos">Gerenciar cargos →</Link>
        </div>
      </aside>
    </section>

    {guests.length===0?<section className="adminEmptyState">
      <strong>{q||type?"Nenhum cadastro encontrado.":"Nenhum hóspede cadastrado."}</strong>
      <p>{q||type?"Ajuste a busca ou o tipo de cadastro.":"Use o formulário acima para criar o primeiro cadastro."}</p>
    </section>:<section className="adminStack">
      {guests.map(guest=><article className="adminListCard" key={guest.id}>
        <div className="adminListCardHead">
          <div>
            <small>{guest.employee?"COLABORADOR":guest.monthlyGuest?"MENSALISTA":guest.documentType||"HÓSPEDE"}</small>
            <h3>{guest.name}</h3>
            <p>{guest.phone}{guest.email?" • "+guest.email:""}</p>
          </div>
          <span className={"adminChip "+(guest._count.bookings?"ok":"")}>{guest._count.bookings} reserva(s)</span>
        </div>
        <div className="adminMetaRow">
          {guest.monthlyGuest&&<span className="adminChip ok">Mensalista</span>}
          {guest.monthlyGuest&&guest.monthlyPaymentDueAt&&<span className={"adminChip "+(guest.monthlyPaymentDueAt<new Date()?"warn":"")}>Próx. pagamento {guest.monthlyPaymentDueAt.toLocaleDateString("pt-BR")}</span>}
          {guest.employee&&<span className="adminChip">Colaborador</span>}
          {guest.employee&&positionByGuest.get(guest.id)&&<span className="adminChip ok">{positionByGuest.get(guest.id)}</span>}
          {guest.document&&<span className="adminChip">{guest.document}</span>}
          {guest.city&&<span className="adminChip">{guest.city}{guest.state?" / "+guest.state:""}</span>}
          {guest.nationality&&<span className="adminChip">{guest.nationality}</span>}
          <span className="adminChip">Atualizado {guest.updatedAt.toLocaleDateString("pt-BR")}</span>
        </div>
        <div className="adminInlineActions">
          <Link className="highlight" href={"/admin/hospedes/"+guest.id}>Abrir ficha →</Link>
        </div>
      </article>)}
    </section>}
  </main>;
}
