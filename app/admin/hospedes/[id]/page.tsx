import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {linkGuestBooking,registerMonthlyPayment,updateGuest} from "../actions";

export const dynamic="force-dynamic";

export default async function GuestDetail({
  params
}:{
  params:Promise<{id:string}>
}){
  await requireAdmin();
  const {id}=await params;

  const guest=await prisma.guest.findUnique({
    where:{id},
    include:{
      bookings:{
        include:{
          accommodation:true,
          payments:{where:{status:"PAID"}},
          charges:true
        },
        orderBy:{createdAt:"desc"}
      }
    }
  });
  if(!guest)notFound();

  let staffSchemaReady=true;
  let staffAssignment:{positionId:string;position:{name:string;description:string|null;active:boolean}}|null=null;
  let staffPositions:Array<{id:string;name:string;description:string|null;active:boolean}>=[];

  try{
    staffAssignment=await prisma.staffAssignment.findUnique({
      where:{guestId:guest.id},
      select:{
        positionId:true,
        position:{select:{name:true,description:true,active:true}}
      }
    });
    staffPositions=await prisma.staffPosition.findMany({
      where:{
        OR:[
          {active:true},
          ...(staffAssignment?[{id:staffAssignment.positionId}]:[])
        ]
      },
      orderBy:[{sortOrder:"asc"},{name:"asc"}],
      select:{id:true,name:true,description:true,active:true}
    });
  }catch(error){
    staffSchemaReady=false;
    console.error("STAFF_POSITION_SCHEMA_PENDING",error);
  }

  const candidates=await prisma.bookingLead.findMany({
    where:{
      guestId:null,
      OR:[
        {phone:guest.phone},
        {name:{equals:guest.name,mode:"insensitive"}}
      ]
    },
    include:{accommodation:true},
    orderBy:{createdAt:"desc"},
    take:20
  });

  const quoted=guest.bookings.reduce((sum,booking)=>sum+(booking.quotedTotalCents||0)+booking.charges.reduce((value,charge)=>value+charge.amountCents,0),0);
  const paid=guest.bookings.reduce(
    (sum,booking)=>sum+booking.payments
      .filter(payment=>payment.reference!=="RESTAURANT_FOLIO")
      .reduce((value,payment)=>value+payment.amountCents,0),
    0
  );
  const lastStay=guest.bookings
    .filter(booking=>booking.checkOut)
    .sort((a,b)=>(b.checkOut?.getTime()||0)-(a.checkOut?.getTime()||0))[0];

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH PMS / CRM 2.0</small>
        <h1>{guest.name}</h1>
        <p>{guest.phone}{guest.email?" • "+guest.email:""}{guest.document?" • "+(guest.documentType?guest.documentType+" ":"")+guest.document:""}</p>
        <div className="adminMetaRow" style={{marginTop:12}}>
          {guest.monthlyGuest&&<span className="adminChip ok">Mensalista</span>}
          {guest.employee&&<span className="adminChip">Colaborador</span>}
          {(guest.monthlyGuest||guest.employee)&&<span className="adminChip">Hospedagem opcional</span>}
        </div>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/hospedes">← Hóspedes</Link>
        <Link className="adminSecondaryAction" href="/admin/reservas">Reservas →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Reservas</small><strong>{guest.bookings.length}</strong></div>
      <div><small>Valor histórico</small><strong style={{fontSize:18}}>{(quoted/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></div>
      <div><small>Recebido</small><strong style={{fontSize:18}}>{(paid/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></div>
      <div><small>Última saída</small><strong style={{fontSize:16}}>{lastStay?.checkOut?.toLocaleDateString("pt-BR")||"—"}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Perfil do hóspede</h2>
        <p>Dados pessoais e de atendimento usados pela equipe. Preferências e observações são internas.</p>
        <form action={updateGuest} className="adminFormGrid">
          <input type="hidden" name="id" value={guest.id}/>
          <label className="span2">Nome completo
            <input name="name" required defaultValue={guest.name}/>
          </label>
          <label>Telefone / WhatsApp
            <input name="phone" required defaultValue={guest.phone}/>
          </label>
          <label>E-mail
            <input name="email" type="email" defaultValue={guest.email||""}/>
          </label>
          <label>Tipo de documento
            <select name="documentType" defaultValue={guest.documentType||"CPF"}>
              <option value="CPF">CPF</option>
              <option value="RG">RG</option>
              <option value="PASSAPORTE">Passaporte</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          <label>Documento
            <input name="document" defaultValue={guest.document||""}/>
          </label>
          <label>Data de nascimento
            <input name="birthDate" type="date" defaultValue={guest.birthDate?.toISOString().slice(0,10)||""}/>
          </label>
          <label>Nacionalidade
            <input name="nationality" defaultValue={guest.nationality||""}/>
          </label>
          <label className="span2">Endereço
            <input name="address" defaultValue={guest.address||""}/>
          </label>
          <label>Cidade
            <input name="city" defaultValue={guest.city||""}/>
          </label>
          <label>Estado
            <input name="state" defaultValue={guest.state||""}/>
          </label>
          <label>CEP
            <input name="postalCode" defaultValue={guest.postalCode||""}/>
          </label>
          <label>Contato de emergência
            <input name="emergencyContact" defaultValue={guest.emergencyContact||""}/>
          </label>
          <label>Próximo pagamento do mensalista
            <input name="monthlyPaymentDueAt" type="date" defaultValue={guest.monthlyPaymentDueAt?.toISOString().slice(0,10)||""}/>
            <small>O sistema gera um lembrete interno para os admins quando essa data chegar.</small>
          </label>
          <label>Categoria / cargo do colaborador
            <select
              name="employeePositionId"
              defaultValue={staffAssignment?.positionId||""}
              disabled={!staffSchemaReady}
            >
              <option value="">Selecione o cargo</option>
              {staffPositions.map(position=><option value={position.id} key={position.id}>
                {position.name}{position.active?"":" — inativo"}
              </option>)}
            </select>
            <small>{staffAssignment?.position.description||"Escolha o cargo quando o cadastro estiver marcado como colaborador."}</small>
          </label>
          <div className="span2 guestMarkerGrid">
            <label className="guestMarkerOption">
              <input name="monthlyGuest" type="checkbox" defaultChecked={guest.monthlyGuest}/>
              <span><b>Mensalista</b><small>Cadastro pode existir sem reserva ou hospedagem vinculada.</small></span>
            </label>
            <label className="guestMarkerOption">
              <input name="employee" type="checkbox" defaultChecked={guest.employee}/>
              <span><b>Colaborador</b><small>Cadastro operacional independente de hospedagem.</small></span>
            </label>
          </div>
          <label className="span2">Preferências de hospedagem
            <textarea name="preferences" rows={4} defaultValue={guest.preferences||""}/>
          </label>
          <label className="span2">Observações internas
            <textarea name="notes" rows={5} defaultValue={guest.notes||""}/>
          </label>
          <button className="span2">Salvar ficha</button>
        </form>
      </article>

      <aside className="adminSectionCard">
        <h2>Resumo CRM</h2>
        <div className="adminStatusLine"><span>Cadastro desde</span><b>{guest.createdAt.toLocaleDateString("pt-BR")}</b></div>
        <div className="adminStatusLine"><span>Última atualização</span><b>{guest.updatedAt.toLocaleDateString("pt-BR")}</b></div>
        <div className="adminStatusLine"><span>Nacionalidade</span><b>{guest.nationality||"—"}</b></div>
        <div className="adminStatusLine"><span>Cidade</span><b>{guest.city?guest.city+(guest.state?" / "+guest.state:""):"—"}</b></div>
        <div className="adminStatusLine"><span>Documento</span><b>{guest.document||"—"}</b></div>
        <div className="adminStatusLine"><span>Mensalista</span><b>{guest.monthlyGuest?"SIM":"NÃO"}</b></div>
        {guest.monthlyGuest&&<div className="adminStatusLine"><span>Próximo pagamento</span><b>{guest.monthlyPaymentDueAt?.toLocaleDateString("pt-BR")||"Não definido"}</b></div>}
        {guest.monthlyGuest&&<div className="adminStatusLine"><span>Último pagamento</span><b>{guest.monthlyPaymentLastPaidAt?.toLocaleDateString("pt-BR")||"Ainda não registrado"}</b></div>}
        <div className="adminStatusLine"><span>Colaborador</span><b>{guest.employee?"SIM":"NÃO"}</b></div>
        {guest.employee&&<div className="adminStatusLine"><span>Cargo</span><b>{staffAssignment?.position.name||"Não definido"}</b></div>}
        {guest.employee&&staffAssignment?.position.description&&<div className="adminPageNote" style={{marginTop:12}}>
          <b>Descrição do cargo</b><br/>{staffAssignment.position.description}
        </div>}
        {guest.monthlyGuest&&<form action={registerMonthlyPayment} className="adminFormGrid" style={{marginTop:16}}>
          <input type="hidden" name="id" value={guest.id}/>
          <label>Registrar pagamento
            <input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0,10)}/>
          </label>
          <button>Confirmar pagamento</button>
        </form>}
        {guest.preferences&&<div className="adminPageNote" style={{marginTop:16}}>
          <b>Preferências</b><br/>{guest.preferences}
        </div>}

        <h2 style={{marginTop:28}}>Reservas para vincular</h2>
        <p>Possíveis reservas encontradas pelo nome ou telefone que ainda não têm hóspede vinculado.</p>
        {candidates.length===0?<div className="adminPageNote">Nenhuma reserva pendente de vínculo.</div>:<div className="adminStack">
          {candidates.map(booking=><div className="adminStatusLine" key={booking.id} style={{alignItems:"flex-start"}}>
            <span>
              <b>{booking.accommodation?.name||"Hospedagem"}</b><br/>
              {booking.checkIn?booking.checkIn.toLocaleDateString("pt-BR"):"Sem data"} • {booking.status}
            </span>
            <form action={linkGuestBooking}>
              <input type="hidden" name="guestId" value={guest.id}/>
              <input type="hidden" name="bookingId" value={booking.id}/>
              <button>Vincular</button>
            </form>
          </div>)}
        </div>}
      </aside>
    </section>

    <section className="adminSectionCard" style={{marginTop:20}}>
      <h2>Histórico de estadias e financeiro</h2>
      <p>Reservas, valores e pagamentos associados a este hóspede.</p>
      {guest.bookings.length===0?<div className="adminPageNote">Ainda não há reservas vinculadas.</div>:<div className="adminStack">
        {guest.bookings.map(booking=>{
          const received=booking.payments
            .filter(payment=>payment.reference!=="RESTAURANT_FOLIO")
            .reduce((sum,payment)=>sum+payment.amountCents,0);
          const extras=booking.charges.reduce((sum,charge)=>sum+charge.amountCents,0);
          const total=(booking.quotedTotalCents||0)+extras;
          return <article className="adminListCard" key={booking.id}>
            <div className="adminListCardHead">
              <div>
                <small>{booking.status} • {booking.source}</small>
                <h3>{booking.accommodation?.name||"Hospedagem"}</h3>
                <p>{booking.checkIn?booking.checkIn.toLocaleDateString("pt-BR"):"—"} → {booking.checkOut?booking.checkOut.toLocaleDateString("pt-BR"):"—"} • {booking.guests} hóspede(s)</p>
              </div>
              <div style={{textAlign:"right"}}>
                <strong>{(total/100).toLocaleString("pt-BR",{style:"currency",currency:booking.quotedCurrency||"BRL"})}</strong>
                <small style={{display:"block",marginTop:5}}>Adicionais {(extras/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} • Pago {(received/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</small>
              </div>
            </div>
            <div className="adminInlineActions">
              <Link className="highlight" href={"/admin/reservas/"+booking.id}>Abrir reserva →</Link>
            </div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
