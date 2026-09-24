import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import MediaPicker from "../components/media-picker";
import {
  cancelRental,
  createBikePreset,
  createRentalItem,
  markRentalPaid,
  returnRental,
  startRental,
  updateRentalItem
} from "./actions";

export const dynamic="force-dynamic";

const money=(value:number|null)=>value==null?"—":(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const localInput=(date=new Date())=>{
  const parts=new Intl.DateTimeFormat("sv-SE",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
  }).format(date);
  return parts.replace(" ","T");
};

export default async function Page(){
  await requireAdmin();
  const now=new Date();
  const [items,rentals,guests,bookings,media]=await Promise.all([
    prisma.rentalItem.findMany({
      include:{rentals:{where:{status:"ACTIVE"},select:{quantity:true,dueAt:true}}},
      orderBy:[{active:"desc"},{sortOrder:"asc"},{name:"asc"}]
    }),
    prisma.rentalOrder.findMany({
      include:{item:true,guest:true,booking:{include:{accommodation:true}}},
      orderBy:[{status:"asc"},{dueAt:"asc"},{createdAt:"desc"}],
      take:250
    }),
    prisma.guest.findMany({orderBy:{name:"asc"},take:500}),
    prisma.bookingLead.findMany({
      where:{status:{in:["CONFIRMED","CHECKED_IN"]}},
      include:{accommodation:true},
      orderBy:{checkIn:"desc"},
      take:300
    }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:300})
  ]);

  const active=rentals.filter(rental=>rental.status==="ACTIVE");
  const overdue=active.filter(rental=>rental.dueAt<now);
  const available=items.reduce((sum,item)=>{
    const used=item.rentals.reduce((value,rental)=>value+rental.quantity,0);
    return sum+Math.max(0,item.quantityTotal-used);
  },0);

  const startDefault=localInput();
  const dueDefault=localInput(new Date(Date.now()+2*3600000));

  return <main className="adminPage rentalsPage">
    <section className="adminPageHero rentalsHero">
      <div>
        <small>MORIAH / SERVIÇOS & INVENTÁRIO</small>
        <h1>Locações</h1>
        <p>Bikes hoje, qualquer equipamento amanhã. Controle quantidade, hora/diária, caução, disponibilidade, retirada e devolução.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/notificacoes">Notificações →</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Itens cadastrados</small><strong>{items.length}</strong></div>
      <div><small>Unidades livres agora</small><strong>{available}</strong></div>
      <div><small>Locações ativas</small><strong>{active.length}</strong></div>
      <div><small>Atrasadas</small><strong>{overdue.length}</strong></div>
    </section>

    {items.length===0&&<section className="rentalPresetBar">
      <div><b>Começar com bicicletas</b><span>Cria um item padrão editável com 2 unidades, preço/hora e diária.</span></div>
      <form action={createBikePreset}><button className="adminPrimaryAction">Criar Bike padrão</button></form>
    </section>}

    <section className="adminTwoCol rentalsSetup">
      <form action={createRentalItem} className="adminSectionCard adminFormGrid">
        <div className="span2"><small>NOVO ITEM</small><h2>Cadastrar item para locação</h2></div>
        <label>Nome<input name="name" required placeholder="Ex.: Bike urbana"/></label>
        <label>Categoria<input name="category" defaultValue="BIKE" placeholder="BIKE, PRAIA, ESPORTE..."/></label>
        <label>Quantidade<input name="quantityTotal" type="number" min="1" defaultValue="1" required/></label>
        <label>Ordem<input name="sortOrder" type="number" defaultValue="100"/></label>
        <label>Preço / hora<input name="hourlyPrice" inputMode="decimal" placeholder="R$"/></label>
        <label>Preço / diária<input name="dailyPrice" inputMode="decimal" placeholder="R$"/></label>
        <label>Caução por unidade<input name="deposit" inputMode="decimal" placeholder="R$ 0,00"/></label>
        <label className="rentalActiveCheck"><input name="active" type="checkbox" defaultChecked/> Item ativo</label>
        <label className="span2">Descrição<textarea name="description" rows={3}/></label>
        <div className="span2"><MediaPicker name="imageUrl" media={media} label="Foto do item" help="Use a Galeria/S3 para manter a imagem persistente."/></div>
        <label className="span2">Observações internas<textarea name="notes" rows={3}/></label>
        <button className="span2">Cadastrar item</button>
      </form>

      <form action={startRental} className="adminSectionCard adminFormGrid rentalStartForm">
        <div className="span2"><small>NOVA LOCAÇÃO</small><h2>Entregar equipamento</h2></div>
        <label className="span2">Item<select name="itemId" required><option value="">Selecione</option>{items.filter(item=>item.active).map(item=><option key={item.id} value={item.id}>{item.name} • {item.quantityTotal} un.</option>)}</select></label>
        <label>Nome do locatário<input name="renterName" required/></label>
        <label>WhatsApp<input name="phone"/></label>
        <label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1"/></label>
        <label>Modalidade<select name="pricingMode" defaultValue="HOURLY"><option value="HOURLY">Por hora</option><option value="DAILY">Diária</option></select></label>
        <label>Retirada<input name="startAt" type="datetime-local" defaultValue={startDefault} required/></label>
        <label>Previsão de devolução<input name="dueAt" type="datetime-local" defaultValue={dueDefault} required/></label>
        <label>Vincular hóspede<select name="guestId"><option value="">Nenhum</option>{guests.map(guest=><option key={guest.id} value={guest.id}>{guest.name} • {guest.phone}</option>)}</select></label>
        <label>Vincular reserva<select name="bookingId"><option value="">Nenhuma</option>{bookings.map(booking=><option key={booking.id} value={booking.id}>{booking.name} • {booking.accommodation?.name||"Sem quarto"}</option>)}</select></label>
        <label>Pagamento<select name="paymentStatus" defaultValue="PENDING"><option value="PENDING">Pendente</option><option value="PAID">Pago</option></select></label>
        <label className="span2">Observações<textarea name="notes" rows={3}/></label>
        <button className="span2 adminPrimaryAction">Iniciar locação</button>
      </form>
    </section>

    <section className="adminSectionCard rentalInventorySection">
      <div className="adminListCardHead"><div><small>CATÁLOGO</small><h2>Itens de locação</h2><p>Edite quantidade, preços e disponibilidade sem mudar o fluxo.</p></div></div>
      <div className="rentalItemGrid">
        {items.map(item=>{
          const used=item.rentals.reduce((sum,rental)=>sum+rental.quantity,0);
          const free=Math.max(0,item.quantityTotal-used);
          return <form action={updateRentalItem} className={"rentalItemCard"+(item.active?"":" isDisabled")} key={item.id}>
            <input type="hidden" name="id" value={item.id}/>
            {item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:<div className="rentalItemPlaceholder">SEM FOTO</div>}
            <div className="rentalItemBody">
              <div className="rentalItemHead"><span>{item.category}</span><b>{free}/{item.quantityTotal} livres</b></div>
              <input className="rentalItemName" name="name" defaultValue={item.name}/>
              <textarea name="description" rows={2} defaultValue={item.description||""}/>
              <div className="rentalItemEditGrid">
                <label>Qtd.<input name="quantityTotal" type="number" min="1" defaultValue={item.quantityTotal}/></label>
                <label>Categoria<input name="category" defaultValue={item.category}/></label>
                <label>Hora<input name="hourlyPrice" defaultValue={item.hourlyPriceCents==null?"":(item.hourlyPriceCents/100).toFixed(2).replace(".",",")}/></label>
                <label>Diária<input name="dailyPrice" defaultValue={item.dailyPriceCents==null?"":(item.dailyPriceCents/100).toFixed(2).replace(".",",")}/></label>
                <label>Caução<input name="deposit" defaultValue={(item.depositCents/100).toFixed(2).replace(".",",")}/></label>
                <label>Ordem<input name="sortOrder" type="number" defaultValue={item.sortOrder}/></label>
              </div>
              <input type="hidden" name="imageUrl" value={item.imageUrl||""}/>
              <input type="hidden" name="notes" value={item.notes||""}/>
              <label className="rentalActiveCheck"><input name="active" type="checkbox" defaultChecked={item.active}/> Ativo</label>
              <button>Salvar item</button>
            </div>
          </form>;
        })}
      </div>
    </section>

    <section className="adminSectionCard rentalOrdersSection">
      <div className="adminListCardHead"><div><small>OPERAÇÃO</small><h2>Locações e devoluções</h2><p>Ativas primeiro, com atraso destacado automaticamente.</p></div></div>
      {rentals.length===0?<div className="adminEmptyState"><strong>Nenhuma locação ainda.</strong><p>Inicie uma locação no formulário acima.</p></div>:<div className="rentalOrderGrid">
        {rentals.map(rental=>{
          const late=rental.status==="ACTIVE"&&rental.dueAt<now;
          return <article className={"rentalOrderCard status-"+rental.status.toLowerCase()+(late?" isLate":"")} key={rental.id}>
            <header>
              <div><small>#{rental.id.slice(-6).toUpperCase()} • {rental.item.category}</small><h3>{rental.quantity}× {rental.item.name}</h3><p>{rental.renterName}{rental.booking?.accommodation?" • "+rental.booking.accommodation.name:""}</p></div>
              <span className={"adminChip "+(late?"bad":rental.status==="ACTIVE"?"warn":"ok")}>{late?"ATRASADA":rental.status}</span>
            </header>
            <div className="rentalOrderMeta">
              <div><small>Retirada</small><b>{rental.startAt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</b></div>
              <div><small>Prevista</small><b>{rental.dueAt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</b></div>
              <div><small>Total</small><b>{money(rental.totalCents)}</b></div>
              <div><small>Caução</small><b>{money(rental.depositCents)}</b></div>
            </div>
            <div className="adminMetaRow"><span className={"adminChip "+(rental.paymentStatus==="PAID"?"ok":"warn")}>{rental.paymentStatus}</span><span className="adminChip">{rental.pricingMode}</span>{rental.phone&&<span className="adminChip">{rental.phone}</span>}</div>
            {rental.notes&&<div className="adminPageNote">{rental.notes}</div>}
            {rental.status==="ACTIVE"&&<div className="adminInlineActions">
              <form action={returnRental}><input type="hidden" name="id" value={rental.id}/><input type="hidden" name="paymentStatus" value="PAID"/><button className="highlight">Devolver + marcar pago</button></form>
              {rental.paymentStatus!=="PAID"&&<form action={markRentalPaid}><input type="hidden" name="id" value={rental.id}/><button>Marcar pago</button></form>}
              <form action={cancelRental}><input type="hidden" name="id" value={rental.id}/><button className="danger">Cancelar</button></form>
            </div>}
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
