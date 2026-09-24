"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {
  createMapBooking,
  deleteManualBlock,
  updateConfirmedBookingPlacement
} from "./actions";

type Event={
  id:string;
  entityId:string;
  start:string;
  end:string;
  title:string;
  kind:"BOOKING"|"CHANNEL"|"HOLD"|"MANUAL";
  status:string;
  roomId:string;
  room:string;
  guest:string|null;
  guests:number|null;
  valueCents:number|null;
  currency:string;
  source:string;
  notes:string|null;
};

type Room={
  id:string;
  name:string;
  roomNumber:string|null;
  capacity:number;
};

type ViewMode="7"|"15"|"30"|"MONTH";
type Draft={roomId:string;checkIn:string;checkOut:string}|null;

const DAY=86400000;
const utcDay=(date:Date)=>new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
const dayKey=(date:Date)=>date.toISOString().slice(0,10);
const diffDays=(a:Date,b:Date)=>Math.floor((utcDay(a).getTime()-utcDay(b).getTime())/DAY);
const money=(value:number|null,currency:string)=>value==null?null:(value/100).toLocaleString("pt-BR",{style:"currency",currency});

function eventClass(event:Event){
  if(event.kind==="MANUAL")return "isManual";
  if(event.kind==="HOLD")return "isHold";
  if(event.kind==="CHANNEL")return "isChannel";
  if(event.status==="CHECKED_IN")return "isCheckedIn";
  return "isConfirmed";
}

export default function AdminCalendar({events,rooms}:{events:Event[];rooms:Room[]}){
  const today=useMemo(()=>utcDay(new Date()),[]);
  const [cursor,setCursor]=useState(today);
  const [view,setView]=useState<ViewMode>("15");
  const [roomFilter,setRoomFilter]=useState("");
  const [selected,setSelected]=useState<Event|null>(null);
  const [draft,setDraft]=useState<Draft>(null);

  const days=useMemo(()=>{
    if(view==="MONTH"){
      const first=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1));
      const next=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1));
      const count=Math.round((next.getTime()-first.getTime())/DAY);
      return Array.from({length:count},(_,index)=>new Date(first.getTime()+index*DAY));
    }

    const count=Number(view);
    return Array.from({length:count},(_,index)=>new Date(cursor.getTime()+index*DAY));
  },[cursor,view]);

  const rangeStart=days[0]||today;
  const rangeEnd=new Date((days.at(-1)||today).getTime()+DAY);

  const visibleRooms=useMemo(
    ()=>rooms.filter(room=>!roomFilter||room.id===roomFilter),
    [rooms,roomFilter]
  );

  const visibleEvents=useMemo(
    ()=>events.filter(event=>{
      if(roomFilter&&event.roomId!==roomFilter)return false;
      const start=new Date(event.start);
      const end=new Date(event.end);
      return start<rangeEnd&&end>rangeStart;
    }),
    [events,roomFilter,rangeStart,rangeEnd]
  );

  const metrics=useMemo(()=>{
    const occupied=new Set<string>();

    for(const event of visibleEvents){
      const start=Math.max(0,diffDays(new Date(event.start),rangeStart));
      const end=Math.min(days.length,diffDays(new Date(event.end),rangeStart));
      for(let index=start;index<end;index++){
        occupied.add(event.roomId+"|"+dayKey(days[index]));
      }
    }

    const roomDays=Math.max(1,visibleRooms.length*days.length);
    const bookings=visibleEvents.filter(event=>event.kind==="BOOKING");

    return {
      occupancy:Math.round(occupied.size*100/roomDays),
      arrivals:bookings.filter(event=>new Date(event.start)>=rangeStart&&new Date(event.start)<rangeEnd).length,
      departures:bookings.filter(event=>new Date(event.end)>rangeStart&&new Date(event.end)<=rangeEnd).length,
      manual:visibleEvents.filter(event=>event.kind==="MANUAL").length
    };
  },[visibleEvents,visibleRooms.length,days,rangeStart,rangeEnd]);

  function move(direction:number){
    setSelected(null);
    setDraft(null);

    if(view==="MONTH"){
      setCursor(new Date(Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth()+direction,
        1
      )));
      return;
    }

    setCursor(new Date(cursor.getTime()+direction*Number(view)*DAY));
  }

  function setMode(mode:ViewMode){
    setSelected(null);
    setDraft(null);
    setView(mode);
    if(mode==="MONTH"){
      setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1)));
    }
  }

  function startDraft(roomId:string,date:Date){
    const next=new Date(date.getTime()+DAY);
    setSelected(null);
    setDraft({
      roomId,
      checkIn:dayKey(date),
      checkOut:dayKey(next)
    });
  }

  function occupied(roomId:string,date:Date){
    const key=dayKey(date);
    return visibleEvents.some(event=>
      event.roomId===roomId&&
      dayKey(new Date(event.start))<=key&&
      dayKey(new Date(event.end))>key
    );
  }

  const gridTemplate="190px repeat("+days.length+", minmax(44px,1fr))";

  return <section className="reservationMap">
    <div className="reservationMapToolbar">
      <div className="reservationMapNav">
        <button type="button" onClick={()=>move(-1)}>←</button>
        <button type="button" onClick={()=>setCursor(view==="MONTH"
          ?new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1))
          :today
        )}>Hoje</button>
        <button type="button" onClick={()=>move(1)}>→</button>
      </div>

      <div className="reservationMapRange">
        <strong>{rangeStart.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
        <span>até</span>
        <strong>{new Date(rangeEnd.getTime()-DAY).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
      </div>

      <div className="reservationMapViews">
        {(["7","15","30","MONTH"] as ViewMode[]).map(mode=><button
          type="button"
          key={mode}
          className={view===mode?"isActive":""}
          onClick={()=>setMode(mode)}
        >{mode==="MONTH"?"Mês":mode+"d"}</button>)}
      </div>

      <select value={roomFilter} onChange={event=>setRoomFilter(event.target.value)}>
        <option value="">Todas as hospedagens</option>
        {rooms.map(room=><option key={room.id} value={room.id}>
          {room.roomNumber?room.roomNumber+" • ":""}{room.name}
        </option>)}
      </select>
    </div>

    <div className="adminMetricStrip reservationMapMetrics">
      <div><small>Ocupação do período</small><strong>{metrics.occupancy}%</strong></div>
      <div><small>Entradas</small><strong>{metrics.arrivals}</strong></div>
      <div><small>Saídas</small><strong>{metrics.departures}</strong></div>
      <div><small>Bloqueios manuais</small><strong>{metrics.manual}</strong></div>
    </div>

    <div className="reservationLegend">
      <span><i className="isConfirmed"/>Confirmada</span>
      <span><i className="isCheckedIn"/>Hospedado</span>
      <span><i className="isChannel"/>Canal externo</span>
      <span><i className="isHold"/>Hold</span>
      <span><i className="isManual"/>Bloqueio manual</span>
      <span className="reservationMapHint">Clique em um dia livre para criar reserva.</span>
    </div>

    <div className="reservationMapScroll">
      <div className="reservationMapHeader" style={{gridTemplateColumns:gridTemplate}}>
        <div className="reservationMapRoomHeader">HOSPEDAGEM</div>
        {days.map(day=><div
          className={"reservationMapDayHead"+(dayKey(day)===dayKey(today)?" isToday":"")}
          key={dayKey(day)}
        >
          <small>{day.toLocaleDateString("pt-BR",{weekday:"short",timeZone:"UTC"}).replace(".","")}</small>
          <b>{day.getUTCDate()}</b>
        </div>)}
      </div>

      {visibleRooms.map(room=>{
        const roomEvents=visibleEvents
          .filter(event=>event.roomId===room.id)
          .sort((a,b)=>a.start.localeCompare(b.start));

        return <div className="reservationMapRow" style={{gridTemplateColumns:gridTemplate}} key={room.id}>
          <div className="reservationMapRoom">
            <small>{room.roomNumber||"UNIDADE"}</small>
            <strong>{room.name}</strong>
            <span>até {room.capacity} hóspede(s)</span>
          </div>

          {days.map(day=>{
            const isOccupied=occupied(room.id,day);
            return <button
              type="button"
              key={dayKey(day)}
              className={"reservationMapCell reservationMapCellButton"+
                (dayKey(day)===dayKey(today)?" isToday":"")+
                (isOccupied?" isOccupied":"")
              }
              disabled={isOccupied}
              aria-label={isOccupied
                ?"Data ocupada"
                :"Criar reserva em "+room.name+" em "+day.toLocaleDateString("pt-BR",{timeZone:"UTC"})
              }
              onClick={()=>startDraft(room.id,day)}
            />;
          })}

          {roomEvents.map((event,index)=>{
            const start=Math.max(0,diffDays(new Date(event.start),rangeStart));
            const end=Math.min(days.length,diffDays(new Date(event.end),rangeStart));
            if(end<=start)return null;

            return <button
              type="button"
              key={event.id}
              className={"reservationMapEvent "+eventClass(event)}
              style={{
                gridColumn:(start+2)+" / "+(end+2),
                gridRow:String(index%2+1)
              }}
              title={event.title}
              onClick={()=>{
                setDraft(null);
                setSelected(event);
              }}
            >
              <b>{event.guest||event.title}</b>
              <small>{event.kind==="BOOKING"?event.status:event.source}</small>
            </button>;
          })}
        </div>;
      })}
    </div>

    {visibleRooms.length===0&&<div className="adminEmptyState">
      <strong>Nenhuma hospedagem ativa.</strong>
      <p>Cadastre ou ative uma hospedagem para usar o mapa.</p>
    </div>}

    {draft&&<aside className="reservationDetail reservationDraft">
      <div className="reservationDetailHead">
        <div>
          <small>NOVA RESERVA / MAPA 3.0</small>
          <h2>Reserva direta</h2>
          <p>{rooms.find(room=>room.id===draft.roomId)?.name}</p>
        </div>
        <button type="button" onClick={()=>setDraft(null)}>Fechar</button>
      </div>

      <form action={createMapBooking} className="adminFormGrid cols3">
        <label>Hospedagem
          <select name="accommodationId" defaultValue={draft.roomId} required>
            {rooms.map(room=><option key={room.id} value={room.id}>
              {room.roomNumber?room.roomNumber+" • ":""}{room.name}
            </option>)}
          </select>
        </label>
        <label>Entrada
          <input name="checkIn" type="date" defaultValue={draft.checkIn} required/>
        </label>
        <label>Saída
          <input name="checkOut" type="date" defaultValue={draft.checkOut} required/>
        </label>
        <label className="span2">Nome do hóspede
          <input name="name" required autoComplete="name"/>
        </label>
        <label>Hóspedes
          <input name="guests" type="number" min="1" max="50" defaultValue="1" required/>
        </label>
        <label>Telefone / WhatsApp
          <input name="phone" required autoComplete="tel"/>
        </label>
        <label>E-mail
          <input name="email" type="email" autoComplete="email"/>
        </label>
        <label className="span2">Observação interna
          <input name="internalNotes" placeholder="Opcional"/>
        </label>
        <button className="span2">Validar disponibilidade e confirmar reserva</button>
      </form>
    </aside>}

    {selected&&<aside className="reservationDetail">
      <div className="reservationDetailHead">
        <div>
          <small>{selected.kind} • {selected.status}</small>
          <h2>{selected.guest||selected.title}</h2>
          <p>{selected.room} • {selected.source}</p>
        </div>
        <button type="button" onClick={()=>setSelected(null)}>Fechar</button>
      </div>

      <div className="reservationDetailGrid">
        <div><small>Entrada / início</small><b>{new Date(selected.start).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div>
        <div><small>Saída / fim</small><b>{new Date(selected.end).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div>
        <div><small>Hóspedes</small><b>{selected.guests??"—"}</b></div>
        <div><small>Valor</small><b>{money(selected.valueCents,selected.currency)||"—"}</b></div>
      </div>

      {selected.notes&&<div className="adminPageNote">{selected.notes}</div>}

      {selected.kind==="BOOKING"&&<div className="adminInlineActions">
        <Link className="highlight" href={"/admin/reservas/"+selected.entityId}>Abrir ficha completa →</Link>
      </div>}

      {selected.kind==="BOOKING"&&selected.status==="CONFIRMED"&&<form
        action={updateConfirmedBookingPlacement}
        className="adminFormGrid cols3"
        style={{marginTop:18}}
      >
        <input type="hidden" name="id" value={selected.entityId}/>
        <label>Hospedagem
          <select name="accommodationId" defaultValue={selected.roomId} required>
            {rooms.map(room=><option key={room.id} value={room.id}>
              {room.roomNumber?room.roomNumber+" • ":""}{room.name}
            </option>)}
          </select>
        </label>
        <label>Nova entrada
          <input name="checkIn" type="date" required defaultValue={selected.start.slice(0,10)}/>
        </label>
        <label>Nova saída
          <input name="checkOut" type="date" required defaultValue={selected.end.slice(0,10)}/>
        </label>
        <button className="span2">Validar e mover reserva</button>
      </form>}

      {selected.kind==="MANUAL"&&<form action={deleteManualBlock} style={{marginTop:18}}>
        <input type="hidden" name="id" value={selected.entityId}/>
        <button className="danger">Remover bloqueio manual</button>
      </form>}
    </aside>}
  </section>;
}
