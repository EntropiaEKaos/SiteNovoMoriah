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
  bedNumber?:number|null;
  bedLevel?:string|null;
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
  const [bookingError,setBookingError]=useState("");
  const [bookingSaving,setBookingSaving]=useState(false);
  const [draftMode,setDraftMode]=useState<"BOOKING"|"BLOCK">("BOOKING");
  const [dragging,setDragging]=useState<Event|null>(null);
  const [dropKey,setDropKey]=useState("");
  const [moveError,setMoveError]=useState("");
  const [editError,setEditError]=useState("");
  const [editSaving,setEditSaving]=useState(false);
  const [showOnlyAvailable,setShowOnlyAvailable]=useState(false);
  const [density,setDensity]=useState<"comfortable"|"compact">("comfortable");
  const [hoveredDay,setHoveredDay]=useState<string|null>(null);
  const [selectionStart,setSelectionStart]=useState<{roomId:string;date:string}|null>(null);
  const [selectionEnd,setSelectionEnd]=useState<string|null>(null);

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
        event.title,event.guest,event.room,event.status,event.source,event.bedNumber?String(event.bedNumber):""
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
    setBookingError("");
    setDraft({mode:draftMode,roomId,checkIn:dayKey(date),checkOut:dayKey(next)});
  }

  function completeSelection(roomId:string,date:Date){
    if(!selectionStart||selectionStart.roomId!==roomId)return;
    const first=selectionStart.date;
    const last=dayKey(date);
    const begin=first<last?first:last;
    const finish=first<last?last:first;
    const end=dayKey(new Date(new Date(finish+"T00:00:00Z").getTime()+DAY));
    setSelectionStart(null);setSelectionEnd(null);
    if(events.some(event=>event.roomId===roomId&&dayKey(new Date(event.start))<end&&dayKey(new Date(event.end))>begin)){
      setMoveError("O período selecionado possui ocupação ou bloqueio. Escolha datas livres.");
      return;
    }
    setMoveError("");setSelected(null);setBookingError("");
    setDraft({mode:draftMode,roomId,checkIn:begin,checkOut:end});
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
    setMoveError("");
    startTransition(async()=>{
      try{
        await updateConfirmedBookingPlacement(form);
        setSelected(null);
        router.refresh();
      }catch(error){
        setMoveError(error instanceof Error&&error.message&&!/digest/i.test(error.message)
          ?error.message:"Não foi possível mover a reserva. Confira a disponibilidade e tente novamente.");
      }finally{
        setDragging(null);
        setDropKey("");
      }
    });
  }

  async function submitQuickMove(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(editSaving)return;
    setEditSaving(true);setEditError("");
    try{
      await updateConfirmedBookingPlacement(new FormData(event.currentTarget));
      setSelected(null);
      router.refresh();
    }catch(error){
      setEditError(error instanceof Error&&error.message&&!/digest/i.test(error.message)?error.message:"Não foi possível salvar. Confira as datas e a disponibilidade.");
    }finally{setEditSaving(false);}
  }

  async function submitMapBooking(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(bookingSaving)return;
    const form=event.currentTarget;
    setBookingError("");
    setBookingSaving(true);
    try{
      const result=await createMapBooking(new FormData(form));
      if(!result.ok){
        setBookingError(result.message||"Não foi possível confirmar a reserva.");
        return;
      }
      setDraft(null);
      router.refresh();
    }catch(error){
      setBookingError(error instanceof Error&&error.message&&!/digest/i.test(error.message)
        ?error.message
        :"Não foi possível confirmar a reserva. Confira disponibilidade e tarifas ou tente novamente.");
    }finally{
      setBookingSaving(false);
    }
  }

  const gridTemplate="190px repeat("+days.length+", minmax(44px,1fr))";
  const dateLabel=(date:Date)=>date.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"UTC"});

  return <section className={"reservationMap reservationMap50 calendarPremiumV7 "+(density==="compact"?"calendarDensityCompact ":"")+(isPending?" isSaving":"")}>
    <div className="calendarPremiumHero"><div><span className="calendarPremiumEyebrow">MORIAH · CENTRAL DE HOSPEDAGENS</span><h1>Mapa de reservas <em>7.0</em></h1><p>Uma visão clara de cada hospedagem, chegada e saída.</p></div><div className="calendarPremiumHeroAside"><span className="calendarLiveDot"/> Painel operacional <strong>{visibleRooms.length} hospedagens</strong></div></div>
    <div className="reservationMapToolbar">
      <div className="reservationMapNav" aria-label="Navegação do calendário">
        <button type="button" onClick={()=>move(-1)} aria-label="Período anterior" title="Período anterior">←</button>
        <button type="button" onClick={()=>setCursor(view==="MONTH"?new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)):today)}>Hoje</button>
        <button type="button" onClick={()=>move(1)} aria-label="Próximo período" title="Próximo período">→</button>
      </div>

      <label className="calendarJumpToDate" style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
        Ir para data
        <input type="date" aria-label="Ir para data no calendário" value={dayKey(cursor)}
          onChange={event=>{
            if(!event.target.value)return;
            const chosen=new Date(event.target.value+"T00:00:00Z");
            if(Number.isNaN(chosen.getTime()))return;
            setSelected(null);setDraft(null);
            setCursor(view==="MONTH"?new Date(Date.UTC(chosen.getUTCFullYear(),chosen.getUTCMonth(),1)):chosen);
          }}/>
      </label>
      <Link href="/admin/canais" className="adminSecondaryAction" title="Abrir integrações Booking, Airbnb e Smoobu">Integrações de canais ↗</Link>
      <div className="reservationMapRange">
        <strong>{rangeStart.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
        <span>até</span>
        <strong>{new Date(rangeEnd.getTime()-DAY).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong>
      </div>

      <div className="reservationMapViews">
        {(["7","15","30","MONTH"] as ViewMode[]).map(mode=><button type="button" key={mode} className={view===mode?"isActive":""} onClick={()=>setMode(mode)}>{mode==="MONTH"?"Mês":mode+"d"}</button>)}
      </div>

      <select aria-label="Filtrar hospedagem" value={roomFilter} onChange={event=>setRoomFilter(event.target.value)}>
        <option value="">Todas as hospedagens</option>
        {rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}
      </select>
      <input aria-label="Buscar reserva ou hóspede" className="reservationMapSearch" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar hóspede..."/>
    </div>

    <div className="calendarDirectCommandBar">
      <div><small>COMANDO AO CLICAR EM DIA LIVRE</small><b>{draftMode==="BOOKING"?"Nova reserva":"Novo bloqueio"}</b></div>
      <div>
        <button type="button" className={draftMode==="BOOKING"?"isActive":""} onClick={()=>setDraftMode("BOOKING")}>+ Reserva</button>
        <button type="button" className={draftMode==="BLOCK"?"isActive":""} onClick={()=>setDraftMode("BLOCK")}>+ Bloqueio</button>
      </div>
      <p>Reservas confirmadas também podem ser arrastadas para outra data/quarto. O sistema valida disponibilidade e recalcula a tarifa antes de salvar.</p>
    </div>

    <div className="calendarEnhancedToolbar" role="group" aria-label="Ferramentas de visualização do calendário">
      <div className="calendarEnhancedTitle"><span aria-hidden="true">✦</span><div><strong>Visão operacional ao vivo</strong><small>Clique em um dia livre ou arraste entre dias livres para selecionar um período</small></div></div>
      <div className="calendarDensitySwitch" role="group" aria-label="Densidade do calendário"><button type="button" className={density==="comfortable"?"isActive":""} aria-pressed={density==="comfortable"} onClick={()=>setDensity("comfortable")}>Confortável</button><button type="button" className={density==="compact"?"isActive":""} aria-pressed={density==="compact"} onClick={()=>setDensity("compact")}>Compacta</button></div>
      <label className="calendarAvailableToggle"><input type="checkbox" checked={showOnlyAvailable} onChange={event=>setShowOnlyAvailable(event.target.checked)}/> Destacar dias livres</label>
      <button type="button" onClick={()=>{setSearch("");setRoomFilter("");setShowOnlyAvailable(false);setSelected(null);setDraft(null);}}>Limpar filtros</button>
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

    {moveError&&<div className="adminPageNote" role="alert" aria-live="assertive">{moveError} <button type="button" onClick={()=>setMoveError("")}>Dispensar</button></div>}
    <div className="reservationMapScroll" role="region" aria-label="Mapa de reservas por hospedagem e data" tabIndex={0}>
      <div className="reservationMapHeader" style={{gridTemplateColumns:gridTemplate}}>
        <div className="reservationMapRoomHeader">HOSPEDAGEM</div>
        {days.map(day=><div className={"reservationMapDayHead"+(dayKey(day)===dayKey(today)?" isToday":"")+(hoveredDay===dayKey(day)?" isHoveredDay":"")} key={dayKey(day)}>
          <small>{day.toLocaleDateString("pt-BR",{weekday:"short",timeZone:"UTC"}).replace(".","")}</small><b>{day.getUTCDate()}</b>
        </div>)}
      </div>

      {visibleRooms.length===0&&<div className="calendarEmptyState" role="status">Nenhuma hospedagem corresponde aos filtros. Limpe os filtros para voltar a visualizar o mapa.</div>}
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
                (showOnlyAvailable&&!isOccupied?" isAvailableHighlighted":"")+
                (selectionStart?.roomId===room.id&&selectionEnd&&dayKey(day)>=(selectionStart.date<selectionEnd?selectionStart.date:selectionEnd)&&dayKey(day)<=(selectionStart.date>selectionEnd?selectionStart.date:selectionEnd)?" isRangeSelecting":"")+
                (dayKey(day)===dayKey(today)?" isToday":"")+
                (isOccupied?" isOccupied":"")+
                (dropAllowed?" isDropAllowed":"")+
                (dropKey===keyValue?" isDropHover":"")
              }
              aria-disabled={isOccupied}
              aria-label={`${room.name}, ${dateLabel(day)}: ${isOccupied?"ocupado":"livre; criar "+(draftMode==="BOOKING"?"reserva":"bloqueio")}`}
              title={`${room.name} • ${dateLabel(day)} • ${isOccupied?"Ocupado":"Disponível"}`}
              onMouseDown={event=>{if(event.button===0&&!dragging&&!isOccupied){setSelectionStart({roomId:room.id,date:dayKey(day)});setSelectionEnd(dayKey(day));}}}
              onMouseUp={()=>{if(selectionStart)completeSelection(room.id,day);}}
              onMouseEnter={()=>{setHoveredDay(dayKey(day));if(selectionStart?.roomId===room.id)setSelectionEnd(dayKey(day));}}
              onMouseLeave={()=>setHoveredDay(null)}
              onFocus={()=>setHoveredDay(dayKey(day))}
              onBlur={()=>setHoveredDay(null)}
              onClick={()=>{if(!isOccupied&&!selectionStart&&!draft)startDraft(room.id,day);}}
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
              title={`${event.guest||event.title} • ${event.room} • ${new Date(event.start).toLocaleDateString("pt-BR",{timeZone:"UTC"})} a ${new Date(event.end).toLocaleDateString("pt-BR",{timeZone:"UTC"})}`}
              aria-label={`Abrir ${event.guest||event.title}, ${event.room}, ${event.status}`}
              aria-haspopup="dialog"
              onDragStart={()=>{if(draggable){setDragging(event);setSelected(null);setDraft(null);}}}
              onDragEnd={()=>{setDragging(null);setDropKey("");}}
              onClick={()=>{setDraft(null);setEditError("");setSelected(event);}}
            >
              <b>{event.guest||event.title}</b>{event.bedNumber&&<small>Cama {event.bedNumber} • {event.bedLevel==="BAIXA"?"Baixa":event.bedLevel==="MEDIA"?"Média":"Alta"}</small>}<small>{event.kind==="BOOKING"?event.status:event.source}</small>
            </button>;
          })}
        </div>;
      })}
    </div>

    {dragging&&<div className="calendarDragBanner"><b>Movendo {dragging.guest||dragging.title}</b><span>Solte em uma célula verde livre.</span></div>}

    {draft&&<aside className="reservationDetail reservationDraft">
      <div className="reservationDetailHead">
        <div><small>{draft.mode==="BOOKING"?"NOVA RESERVA":"NOVO BLOQUEIO"} / CALENDÁRIO 7.0</small><h2>{draft.mode==="BOOKING"?"Reserva direta":"Bloqueio operacional"}</h2><p>{rooms.find(room=>room.id===draft.roomId)?.name}</p></div>
        <button type="button" onClick={()=>setDraft(null)}>Fechar</button>
      </div>

      {draft.mode==="BOOKING"?<form onSubmit={submitMapBooking} className="adminFormGrid cols3">
        <label>Hospedagem<select name="accommodationId" defaultValue={draft.roomId} required>{rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}</select></label>
        <label>Entrada<input name="checkIn" type="date" defaultValue={draft.checkIn} required/></label>
        <label>Saída<input name="checkOut" type="date" defaultValue={draft.checkOut} required/></label>
        <label className="span2">Nome do hóspede<input name="name" required autoComplete="name"/></label>
        <label>Hóspedes<input name="guests" type="number" min="1" max="50" defaultValue="1" required/></label>
        <label>Telefone / WhatsApp<input name="phone" required autoComplete="tel"/></label>
        <label>E-mail<input name="email" type="email" autoComplete="email"/></label>
        <label className="span2">Observação interna<input name="internalNotes" placeholder="Opcional"/></label>
        {bookingError&&<div className="span2 adminPageNote" role="alert">{bookingError}</div>}
        <button className="span2" disabled={bookingSaving}>{bookingSaving?"Validando reserva…":"Validar e confirmar reserva"}</button>
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

      {selected.bedNumber&&<div className="adminPageNote">Cama {selected.bedNumber} • {selected.bedLevel==="BAIXA"?"Baixa":selected.bedLevel==="MEDIA"?"Média":"Alta"}</div>}
      {selected.notes&&<div className="adminPageNote">{selected.notes}</div>}

      {selected.kind==="BOOKING"&&<div className="calendarQuickCommands">
        <Link className="highlight" href={"/admin/reservas/"+selected.entityId}>Abrir ficha completa →</Link>
        {selected.status==="CONFIRMED"&&<Link href={"/admin/reservas/"+selected.entityId}>Preparar check-in</Link>}
        {selected.status==="CONFIRMED"&&<form action={calendarPmsAction}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="action" value="NO_SHOW"/><button>No-show</button></form>}
        {selected.status==="CHECKED_IN"&&<form action={calendarPmsAction}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="action" value="CHECK_OUT"/><button className="highlight">Check-out</button></form>}
        {selected.status==="CONFIRMED"&&<form action={calendarBookingStatus}><input type="hidden" name="id" value={selected.entityId}/><input type="hidden" name="status" value="CANCELLED"/><button className="danger">Cancelar reserva</button></form>}
      </div>}

      {selected.kind==="BOOKING"&&selected.status==="CONFIRMED"&&<form onSubmit={submitQuickMove} className="adminFormGrid cols3 calendarMoveForm">
        <div className="span2 calendarQuickEditHeading"><strong>✦ Edição rápida no calendário</strong><small>Altere a hospedagem ou as datas sem sair do mapa. O servidor valida conflitos antes de salvar.</small></div>
        <label>Hospedagem<select name="accommodationId" defaultValue={selected.roomId} required>{rooms.map(room=><option key={room.id} value={room.id}>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</option>)}</select></label>
        <label>Nova entrada<input name="checkIn" type="date" required defaultValue={selected.start.slice(0,10)}/></label>
        <label>Nova saída<input name="checkOut" type="date" required defaultValue={selected.end.slice(0,10)}/></label>
        <input type="hidden" name="id" value={selected.entityId}/>
        {editError&&<div className="span2 adminPageNote" role="alert">{editError}</div>}
        <button className="span2" disabled={editSaving||isPending}>{editSaving?"Validando disponibilidade…":"Salvar alteração no calendário"}</button>
      </form>}

      {selected.kind==="MANUAL"&&<form action={deleteManualBlock} style={{marginTop:18}}><input type="hidden" name="id" value={selected.entityId}/><button className="danger">Remover bloqueio manual</button></form>}
    </aside>}
  </section>;
}
