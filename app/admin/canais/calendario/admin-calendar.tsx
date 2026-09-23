"use client";

import {useMemo,useState} from "react";
import {deleteManualBlock,updateConfirmedBookingDates} from "./actions";

type Event={id:string;entityId:string;start:string;end:string;title:string;kind:"BOOKING"|"CHANNEL"|"HOLD"|"MANUAL";status:string;roomId:string;room:string;guest:string|null;guests:number|null;valueCents:number|null;currency:string;source:string;notes:string|null};
type Room={id:string;name:string;roomNumber:string|null;capacity:number};
type ViewMode="7"|"15"|"30"|"MONTH";
const DAY=86400000;
const utcDay=(d:Date)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
const dayKey=(d:Date)=>d.toISOString().slice(0,10);
const diffDays=(a:Date,b:Date)=>Math.floor((utcDay(a).getTime()-utcDay(b).getTime())/DAY);
const money=(v:number|null,c:string)=>v==null?null:(v/100).toLocaleString("pt-BR",{style:"currency",currency:c});
function eventClass(e:Event){if(e.kind==="MANUAL")return"isManual";if(e.kind==="HOLD")return"isHold";if(e.kind==="CHANNEL")return"isChannel";if(e.status==="CHECKED_IN")return"isCheckedIn";return"isConfirmed"}

export default function AdminCalendar({events,rooms}:{events:Event[];rooms:Room[]}){
 const today=useMemo(()=>utcDay(new Date()),[]),[cursor,setCursor]=useState(today),[view,setView]=useState<ViewMode>("15"),[roomFilter,setRoomFilter]=useState(""),[selected,setSelected]=useState<Event|null>(null);
 const days=useMemo(()=>{if(view==="MONTH"){const first=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1)),next=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1)),count=Math.round((next.getTime()-first.getTime())/DAY);return Array.from({length:count},(_,i)=>new Date(first.getTime()+i*DAY))}const count=Number(view);return Array.from({length:count},(_,i)=>new Date(cursor.getTime()+i*DAY))},[cursor,view]);
 const rangeStart=days[0]||today,rangeEnd=new Date((days.at(-1)||today).getTime()+DAY);
 const visibleRooms=useMemo(()=>rooms.filter(r=>!roomFilter||r.id===roomFilter),[rooms,roomFilter]);
 const visibleEvents=useMemo(()=>events.filter(e=>{if(roomFilter&&e.roomId!==roomFilter)return false;const s=new Date(e.start),end=new Date(e.end);return s<rangeEnd&&end>rangeStart}),[events,roomFilter,rangeStart,rangeEnd]);
 const metrics=useMemo(()=>{const occupied=new Set<string>();for(const e of visibleEvents){const s=Math.max(0,diffDays(new Date(e.start),rangeStart)),end=Math.min(days.length,diffDays(new Date(e.end),rangeStart));for(let i=s;i<end;i++)occupied.add(e.roomId+"|"+dayKey(days[i]))}const roomDays=Math.max(1,visibleRooms.length*days.length),bookings=visibleEvents.filter(e=>e.kind==="BOOKING");return{occupancy:Math.round(occupied.size*100/roomDays),arrivals:bookings.filter(e=>new Date(e.start)>=rangeStart&&new Date(e.start)<rangeEnd).length,departures:bookings.filter(e=>new Date(e.end)>rangeStart&&new Date(e.end)<=rangeEnd).length,manual:visibleEvents.filter(e=>e.kind==="MANUAL").length}},[visibleEvents,visibleRooms.length,days,rangeStart,rangeEnd]);
 function move(n:number){setSelected(null);if(view==="MONTH"){setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+n,1)));return}setCursor(new Date(cursor.getTime()+n*Number(view)*DAY))}
 function setMode(m:ViewMode){setSelected(null);setView(m);if(m==="MONTH")setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1)))}
 const gridTemplate="190px repeat("+days.length+", minmax(44px,1fr))";
 return <section className="reservationMap">
  <div className="reservationMapToolbar">
   <div className="reservationMapNav"><button type="button" onClick={()=>move(-1)}>←</button><button type="button" onClick={()=>setCursor(view==="MONTH"?new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)):today)}>Hoje</button><button type="button" onClick={()=>move(1)}>→</button></div>
   <div className="reservationMapRange"><strong>{rangeStart.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong><span>até</span><strong>{new Date(rangeEnd.getTime()-DAY).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong></div>
   <div className="reservationMapViews">{(["7","15","30","MONTH"] as ViewMode[]).map(m=><button type="button" key={m} className={view===m?"isActive":""} onClick={()=>setMode(m)}>{m==="MONTH"?"Mês":m+"d"}</button>)}</div>
   <select value={roomFilter} onChange={e=>setRoomFilter(e.target.value)}><option value="">Todas as hospedagens</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.roomNumber?r.roomNumber+" • ":""}{r.name}</option>)}</select>
  </div>
  <div className="adminMetricStrip reservationMapMetrics"><div><small>Ocupação do período</small><strong>{metrics.occupancy}%</strong></div><div><small>Entradas</small><strong>{metrics.arrivals}</strong></div><div><small>Saídas</small><strong>{metrics.departures}</strong></div><div><small>Bloqueios manuais</small><strong>{metrics.manual}</strong></div></div>
  <div className="reservationLegend"><span><i className="isConfirmed"/>Confirmada</span><span><i className="isCheckedIn"/>Hospedado</span><span><i className="isChannel"/>Canal externo</span><span><i className="isHold"/>Hold</span><span><i className="isManual"/>Bloqueio manual</span></div>
  <div className="reservationMapScroll">
   <div className="reservationMapHeader" style={{gridTemplateColumns:gridTemplate}}><div className="reservationMapRoomHeader">HOSPEDAGEM</div>{days.map(d=><div className={"reservationMapDayHead"+(dayKey(d)===dayKey(today)?" isToday":"")} key={dayKey(d)}><small>{d.toLocaleDateString("pt-BR",{weekday:"short",timeZone:"UTC"}).replace(".","")}</small><b>{d.getUTCDate()}</b></div>)}</div>
   {visibleRooms.map(room=>{const roomEvents=visibleEvents.filter(e=>e.roomId===room.id).sort((a,b)=>a.start.localeCompare(b.start));return <div className="reservationMapRow" style={{gridTemplateColumns:gridTemplate}} key={room.id}>
    <div className="reservationMapRoom"><small>{room.roomNumber||"UNIDADE"}</small><strong>{room.name}</strong><span>até {room.capacity} hóspede(s)</span></div>
    {days.map(d=><div key={dayKey(d)} className={"reservationMapCell"+(dayKey(d)===dayKey(today)?" isToday":"")}/>)}
    {roomEvents.map((e,index)=>{const start=Math.max(0,diffDays(new Date(e.start),rangeStart)),end=Math.min(days.length,diffDays(new Date(e.end),rangeStart));if(end<=start)return null;return <button type="button" key={e.id} className={"reservationMapEvent "+eventClass(e)} style={{gridColumn:(start+2)+" / "+(end+2),gridRow:String(index%2+1)}} title={e.title} onClick={()=>setSelected(e)}><b>{e.guest||e.title}</b><small>{e.kind==="BOOKING"?e.status:e.source}</small></button>})}
   </div>})}
  </div>
  {visibleRooms.length===0&&<div className="adminEmptyState"><strong>Nenhuma hospedagem ativa.</strong><p>Cadastre ou ative uma hospedagem para usar o mapa.</p></div>}
  {selected&&<aside className="reservationDetail">
   <div className="reservationDetailHead"><div><small>{selected.kind} • {selected.status}</small><h2>{selected.guest||selected.title}</h2><p>{selected.room} • {selected.source}</p></div><button type="button" onClick={()=>setSelected(null)}>Fechar</button></div>
   <div className="reservationDetailGrid"><div><small>Entrada / início</small><b>{new Date(selected.start).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div><div><small>Saída / fim</small><b>{new Date(selected.end).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</b></div><div><small>Hóspedes</small><b>{selected.guests??"—"}</b></div><div><small>Valor</small><b>{money(selected.valueCents,selected.currency)||"—"}</b></div></div>
   {selected.notes&&<div className="adminPageNote">{selected.notes}</div>}
   {selected.kind==="BOOKING"&&selected.status==="CONFIRMED"&&<form action={updateConfirmedBookingDates} className="adminFormGrid" style={{marginTop:18}}><input type="hidden" name="id" value={selected.entityId}/><label>Nova entrada<input name="checkIn" type="date" required defaultValue={selected.start.slice(0,10)}/></label><label>Nova saída<input name="checkOut" type="date" required defaultValue={selected.end.slice(0,10)}/></label><button className="span2">Validar e alterar período</button></form>}
   {selected.kind==="MANUAL"&&<form action={deleteManualBlock} style={{marginTop:18}}><input type="hidden" name="id" value={selected.entityId}/><button className="danger">Remover bloqueio manual</button></form>}
  </aside>}
 </section>
}
