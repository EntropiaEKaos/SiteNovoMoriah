import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {deleteAccommodation,toggleAccommodation} from "../actions";

export const dynamic="force-dynamic";

export default async function Page(){
  const rooms=await prisma.accommodation.findMany({
    orderBy:[{featured:"desc"},{createdAt:"desc"}]
  });

  const active=rooms.filter(room=>room.active).length;
  const featured=rooms.filter(room=>room.featured).length;
  const capacity=rooms.reduce((sum,room)=>sum+room.capacity,0);

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / INVENTÁRIO</small>
        <h1>Hospedagens</h1>
        <p>Organize quartos, dormitórios e opções para grupos. O que estiver ativo alimenta o site, a reserva e o motor de disponibilidade.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/reservar">Ver reserva ↗</Link>
        <Link className="adminPrimaryAction" href="/admin/hospedagens/nova">+ Nova hospedagem</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Total</small><strong>{rooms.length}</strong></div>
      <div><small>Ativas</small><strong>{active}</strong></div>
      <div><small>Destaques</small><strong>{featured}</strong></div>
      <div><small>Capacidade total</small><strong>{capacity}</strong></div>
    </section>

    {rooms.length===0?<section className="adminEmptyState">
      <strong>Cadastre a primeira hospedagem.</strong>
      <p>Depois disso ela poderá aparecer no site e no fluxo de reservas.</p>
      <Link className="adminPrimaryAction" href="/admin/hospedagens/nova">Criar hospedagem</Link>
    </section>:<section className="adminStack">
      {rooms.map(room=><article className="adminListCard" key={room.id}>
        <div className="adminListCardHead">
          <div>
            <small>{room.type}{room.internalCode?" • "+room.internalCode:""}</small>
            <h3>{room.name}</h3>
            <p>{room.description||"Sem descrição cadastrada."}</p>
            {(room.roomNumber||room.floor||room.beds)&&<p style={{marginTop:8,fontSize:12}}>
              {room.roomNumber?"Unidade "+room.roomNumber:""}
              {room.roomNumber&&room.floor?" • ":""}
              {room.floor||""}
              {(room.roomNumber||room.floor)&&room.beds?" • ":""}
              {room.beds||""}
            </p>}
          </div>
          <b>{room.priceCents==null?"Sob consulta":(room.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b>
        </div>

        <div className="adminMetaRow">
          <span className={"adminChip "+(room.active?"ok":"warn")}>{room.active?"Ativa":"Desativada"}</span>
          {room.featured&&<span className="adminChip">Destaque</span>}
          <span className="adminChip">{room.capacity} hóspede(s)</span>
          <span className="adminChip">{room.maxAdults} adulto(s) + {room.maxChildren} criança(s)</span>
          <span className="adminChip">{room.bathrooms} banheiro(s)</span>
          {room.areaSqm&&<span className="adminChip">{room.areaSqm} m²</span>}
          {room.amenities.slice(0,4).map(item=><span className="adminChip" key={item}>{item.replaceAll("_"," ")}</span>)}
          {room.amenities.length>4&&<span className="adminChip">+{room.amenities.length-4}</span>}
        </div>

        <div className="adminInlineActions">
          <Link href={"/admin/hospedagens/"+room.id}>Editar</Link>
          <form action={toggleAccommodation}>
            <input type="hidden" name="id" value={room.id}/>
            <button className={room.active?"":"highlight"}>{room.active?"Desativar":"Ativar"}</button>
          </form>
          <form action={deleteAccommodation}>
            <input type="hidden" name="id" value={room.id}/>
            <button className="danger">Excluir</button>
          </form>
        </div>
      </article>)}
    </section>}
  </main>;
}
