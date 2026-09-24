"use client";

import Link from "next/link";
import {useMemo,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {
  calendarBookingStatus,
  calendarPmsAction,
  createManualBlock,
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
type Draft={
  mode:"BOOKING"|"BLOCK";
  roomId:string;
  checkIn:string;
  checkOut:string;
}|null;

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
  const router=useRouter();
  const [isPending,startTransition]=useTransition();
  const today=useMemo(()=>utcDay(new Date()),[]);
  const [cursor,setCursor]=useState(today);
  const [view,setView]=useState<ViewMode>("15");
  const [roomFilter,setRoomFilter]=useState("");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<Event|null>(null);
  const [draft,setDraft]=useState<Draft>(null);
  const [draftMode,setDraftMode]=useState<"BOOKING"|"BLOCK">("BOOKING");
  const [dragging,setDragging]=useState<Event|null>(null);
  const [dropKey,setDropKey]=useState("");

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
  const q=search.trim().toLowerCase();

  const visibleRooms=useMemo(
    ()=>rooms.filter(room=>!roomFilter||room.id===roomFilter),
    [rooms,roomFilter]
  );

  const visibleEvents=useMemo(
    ()=>events.filter(event=>{
      if(roomFilter&&event.roomId!==roomFilter)return false;
      if(q&&![
        event.title,event.guest,event.room,event.status,event.source
      ].some(value=>String(value||"").toLowerCase().includes(q)))return false;
      const start=new Date(event.start);
      const end=new Date(event.end);
      return start<rangeEnd&&end>rangeStart;
    }),
    [events,roomFilter,q,rangeStart,rangeEnd]
  );

  const metrics=useMemo(()=>{
    const occupied=new Set<string>();
    for(const event of visibleEvents){
      const start=Math.max(0,diffDays(new Date(event.start),rangeStart));
      const end=Math.min(days.length,diffDays(new Date(event.end),rangeStart));
      for(let index=start;index<end;index++)occupied.add(event.roomId+"|"+dayKey(days[index]));
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
    setSelected(null);setDraft(null);
    if(view==="MONTH"){
      setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+direction,1)));
      return;
    }
    setCursor(new Date(cursor.getTime()+direction*Number(view)*DAY));
  }

  function setMode(mode:ViewMode){
    setSelected(null);setDraft(null);setView(mode);
    if(mode==="MONTH")setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1)));
  }

  function startDraft(roomId:string,date:Date){
    const next=new Date(date.getTime()+DAY);
    setSelected(null);
    setDraft({mode:draftMode,roomId,checkIn:dayKey(date),checkOut:dayKey(next)});
  }

  function occupied(roomId:string,date:Date,excludeId?:string){
    const key=dayKey(date);
    return events.some(event=>
      event.id!==excludeId&&event.roomId===roomId&&
      dayKey(new Date(event.start))<=key&&dayKey(new Date(event.end))>key
    );
  }

  function canDrop(roomId:string,date:Date,event:Event|null){
    if(!event||event.kind!=="BOOKING"||event.status!=="CONFIRMED")return false;
    const duration=Math.max(1,diffDays(new Date(event.end),new Date(event.start)));
    for(let offset=0;offset<duration;offset++){
      const day=new Date(date.getTime()+offset*DAY);
      if(occupied(roomId,day,event.id))return false;
    }
    return true;
  }

  function dropBooking(roomId:string,date:Date){
    if(!dragging||!canDrop(roomId,date,dragging))return;
    const duration=Math.max(1,diffDays(new Date(dragging.end),new Date(dragging.start)));
    const checkIn=dayKey(date);
    const checkOut=dayKey(new Date(date.getTime()+duration*DAY));
    const form=new FormData();
    form.set("id",dragging.entityId);
    form.set("accommodationId",roomId);
    form.set("checkIn",checkIn);
    form.set("checkOut",checkOut);
    startTransition(async()=>{
      await updateConfirmedBookingPlacement(form);
      setDragging(null);
      setDropKey("");
      setSelected(null);
      router.refresh();
    });
  }

  const gridTemplate="190px repeat("+days.length+", minmax(44px,1fr))";

  return <section className={"reservationMap reservationMap50"+(isPending?" isSaving":"")}>
    <div className="reservationMapToolbar">
      <div className="reservationMapNav">
        <button type="button" onClick={()=>move(-1)}>←</button>
        <button type="button" onClick={()=>setCursor(view==="MONTH"?new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)):today)}>Hoje</button>
        <button type="button" onClick={()=>move(1)}>→</button>
      </div>

      <div className="reservationMapRange">
        <strong>{rangeStart.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
        <span>até</span>
        <strong>{new Date(rangeEnd.getTime()-DAY).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
      </div>

      <div className="reservationMapViews">
        {(["7","15","30","MONTH"] as ViewMode[]).map(mode=><button type="button" key={mode} className={view===mode?"isActive":""} onClick={()=>setMode(mode)}>{mode==="MONTH"?"Mês":mode+"d"}</button>)}
      </div>

      <select value={roomFilter} onChange={event=>setRoomFilter(event.target.value)}>
        <option value="">Todas as hospedagens</option>
        {rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}
      </select>
      <input className="reservationMapSearch" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar hóspede..."/>
    </div>

    <div className="calendarDirectCommandBar">
      <div><small>COMANDO AO CLICAR EM DIA LIVRE</small><b>{draftMode==="BOOKING"?"Nova reserva":"Novo bloqueio"}</b></div>
      <div>
        <button type="button" className={draftMode==="BOOKING"?"isActive":""} onClick={()=>setDraftMode("BOOKING")}>+ Reserva</button>
        <button type="button" className={draftMode==="BLOCK"?"isActive":""} onClick={()=>setDraftMode("BLOCK")}>+ Bloqueio</button>
      </div>
      <p>Reservas confirmadas também podem ser arrastadas para outra data/quarto. O sistema valida disponibilidade e recalcula a tarifa antes de salvar.</p>
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
      <span className="reservationMapHint">Clique para criar • arraste reserva confirmada para mover.</span>
    </div>

    <div className="reservationMapScroll">
      <div className="reservationMapHeader" style={{gridTemplateColumns:gridTemplate}}>
        <div className="reservationMapRoomHeader">HOSPEDAGEM</div>
        {days.map(day=><div className={"reservationMapDayHead"+(dayKey(day)===dayKey(today)?" isToday":"")} key={dayKey(day)}>
          <small>{day.toLocaleDateString("pt-BR",{weekday:"short",timeZone:"UTC"}).replace(".","")}</small><b>{day.getUTCDate()}</b>
        </div>)}
      </div>

      {visibleRooms.map(room=>{
        const roomEvents=visibleEvents.filter(event=>event.roomId===room.id).sort((a,b)=>a.start.localeCompare(b.start));
        return <div className="reservationMapRow" style={{gridTemplateColumns:gridTemplate}} key={room.id}>
          <div className="reservationMapRoom"><small>{room.roomNumber||"UNIDADE"}</small><strong>{room.name}</strong><span>até {room.capacity} hóspede(s)</span></div>

          {days.map(day=>{
            const isOccupied=occupied(room.id,day);
            const dropAllowed=canDrop(room.id,day,dragging);
            const keyValue=room.id+"|"+dayKey(day);
            return <button
              type="button"
              key={dayKey(day)}
              className={"reservationMapCell reservationMapCellButton"+
                (dayKey(day)===dayKey(today)?" isToday":"")+
                (isOccupied?" isOccupied":"")+
                (dropAllowed?" isDropAllowed":"")+
                (dropKey===keyValue?" isDropHover":"")
              }
              aria-disabled={isOccupied}
              onClick={()=>{if(!isOccupied)startDraft(room.id,day);}}
              onDragOver={event=>{if(dropAllowed){event.preventDefault();setDropKey(keyValue);}}}
              onDragLeave={()=>{if(dropKey===keyValue)setDropKey("");}}
              onDrop={event=>{event.preventDefault();dropBooking(room.id,day);}}
            />;
          })}

          {roomEvents.map((event,index)=>{
            const start=Math.max(0,diffDays(new Date(event.start),rangeStart));
            const end=Math.min(days.length,diffDays(new Date(event.end),rangeStart));
            if(end<=start)return null;
            const draggable=event.kind==="BOOKING"&&event.status==="CONFIRMED";
            return <button
              type="button"
              draggable={draggable}
              key={event.id}
              className={"reservationMapEvent "+eventClass(event)+(draggable?" isDraggable":"")}
              style={{gridColumn:(start+2)+" / "+(end+2),gridRow:String(index%2+1)}}
              title={draggable?"Arraste para mover • clique para comandos":event.title}
              onDragStart={()=>{if(draggable){setDragging(event);setSelected(null);setDraft(null);}}}
              onDragEnd={()=>{setDragging(null);setDropKey("");}}
              onClick={()=>{setDraft(null);setSelected(event);}}
            >
              <b>{event.guest||event.title}</b><small>{event.kind==="BOOKING"?event.status:event.source}</small>
            </button>;
          })}
        </div>;
      })}
    </div>

    {dragging&&<div className="calendarDragBanner"><b>Movendo {dragging.guest||dragging.title}</b><span>Solte em uma célula verde livre.</span></div>}

    {draft&&<aside className="reservationDetail reservationDraft">
      <div className="reservationDetailHead">
        <div><small>{draft.mode==="BOOKING"?"NOVA RESERVA":"NOVO BLOQUEIO"} / CALENDÁRIO 5.0</small><h2>{draft.mode==="BOOKING"?"Reserva direta":"Bloqueio operacional"}</h2><p>{rooms.find(room=>room.id===draft.roomId)?.name}</p></div>
        <button type="button" onClick={()=>setDraft(null)}>Fechar</button>
      </div>

      {draft.mode==="BOOKING"?<form action={createMapBooking} className="adminFormGrid cols3">
        <label>Hospedagem<select name="accommodationId" defaultValue={draft.roomId} required>{rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}</select></label>
        <label>Entrada<input name="checkIn" type="date" defaultValue={draft.checkIn} required/></label>
        <label>Saída<input name="checkOut" type="date" defaultValue={draft.checkOut} required/></label>
        <label className="span2">Nome do hóspede<input name="name" required autoComplete="name"/></label>
        <label>Hóspedes<input name="guests" type="number" min="1" max="50" defaultValue="1" required/></label>
        <label>Telefone / WhatsApp<input name="phone" required autoComplete="tel"/></label>
        <label>E-mail<input name="email" type="email" autoComplete="email"/></label>
        <label className="span2">Observação interna<input name="internalNotes" placeholder="Opcional"/></label>
        <button className="span2">Validar e confirmar reserva</button>
      </form>:<form action={createManualBlock} className="adminFormGrid cols3">
        <label>Hospedagem<select name="accommodationId" defaultValue={draft.roomId} required>{rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}</select></label>
        <label>Início<input name="startsAt" type="date" defaultValue={draft.checkIn} required/></label>
        <label>Fim<input name="endsAt" type="date" defaultValue={draft.checkOut} required/></label>
        <label className="span2">Motivo<input name="reason" required maxLength={160} placeholder="Manutenção, uso interno, interdição..."/></label>
        <label className="span2">Observações<input name="notes" maxLength={1500}/></label>
        <button className="span2">Criar bloqueio</button>
      </form>}
    </aside>}

    {selected&&<aside className="reservationDetail reservationDetail50">
      <div className="reservationDetailHead">
        <div><small>{selected.kind} • {selected.status}</small><h2>{selected.guest||selected.title}</h2><p>{selected.room} • {selected.source}</p></div>
        <button type="button" onClick={()=>setSelected(null)}>Fechar</button>
      </div>

      <div className="reservationDetailGrid">
        <div><small>Entrada / início</small><b>{new Date(selected.start).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div>
        <div><small>Saída / fim</small><b>{new Date(selected.end).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div>
        <div><small>Hóspedes</small><b>{selected.guests??"—"}</b></div>
        <div><small>Valor</small><b>{money(selected.valueCents,selected.currency)||"—"}</b></div>
      </div>

      {selected.notes&&<div className="adminPageNote">{selected.notes}</div>}

      {selected.kind==="BOOKING"&&<div className="calendarQuickCommands">
        <Link className="highlight" href={"/admin/reservas/"+selected.entityId}>Abrir ficha completa →</Link>
        {selected.status==="CONFIRMED"&&<Link href={"/admin/reservas/"+selected.entityId}>Preparar check-in</Link>}
        {selected.status==="CONFIRMED"&&<form action={calendarPmsAction}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="action" value="NO_SHOW"/><button>No-show</button></form>}
        {selected.status==="CHECKED_IN"&&<form action={calendarPmsAction}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="action" value="CHECK_OUT"/><button className="highlight">Check-out</button></form>}
        {selected.status==="CONFIRMED"&&<form action={calendarBookingStatus}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="status" value="CANCELLED"/><button className="danger">Cancelar reserva</button></form>}
      </div>}

      {selected.kind==="BOOKING"&&selected.status==="CONFIRMED"&&<form action={updateConfirmedBookingPlacement} className="adminFormGrid cols3 calendarMoveForm">
        <label>Hospedagem<select name="accommodationId" defaultValue={selected.roomId} required>{rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}</select></label>
        <label>Nova entrada<input name="checkIn" type="date" required defaultValue={selected.start.slice(0,10)}/></label>
        <label>Nova saída<input name="checkOut" type="date" required defaultValue={selected.end.slice(0,10)}/></label>
        <input type="hidden" name="id" value={selected.entityId}/>
        <button className="span2">Validar e mover reserva</button>
      </form>}

      {selected.kind==="MANUAL"&&<form action={deleteManualBlock} style={{marginTop:18}}><input type="hidden" name="id" value={selected.entityId}/><button className="danger">Remover bloqueio manual</button></form>}
    </aside>}
  </section>;
}
