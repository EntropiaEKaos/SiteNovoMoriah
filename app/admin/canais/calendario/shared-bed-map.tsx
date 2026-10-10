"use client";
import Link from "next/link";
import {useState} from "react";

type Room={id:string;name:string;roomNumber:string|null;bedCount:number;sharedRoom:boolean};
type Event={id:string;entityId:string;roomId:string;kind:string;start:string;end:string;guest:string|null;title:string;bedNumber?:number|null;bedLevel?:string|null};
const day=(value:string)=>value.slice(0,10);
const level=(value:string|null|undefined)=>value==="BAIXA"?"Baixa":value==="MEDIA"?"Média":value==="ALTA"?"Alta":"Altura não definida";

export default function SharedBedMap({rooms,events}:{rooms:Room[];events:Event[]}){
  const [selectedDay,setSelectedDay]=useState(()=>new Date().toISOString().slice(0,10));
  const shared=rooms.filter(room=>room.sharedRoom&&room.bedCount>0);
  if(!shared.length)return null;
  const today=events.filter(event=>day(event.start)<=selectedDay&&day(event.end)>selectedDay);
  return <section className="adminSectionCard" style={{marginBottom:20}}>
    <div className="adminListCardHead">
      <div><small>QUARTOS COMPARTILHADOS</small><h2>Mapa individual de camas</h2><p>Confira as camas e as reservas atribuídas na data selecionada.</p></div>
      <label>Data <input type="date" aria-label="Data do mapa de camas" value={selectedDay} onChange={event=>setSelectedDay(event.target.value)}/></label>
    </div>
    {shared.map(room=>{
      const entries=today.filter(event=>event.roomId===room.id);
      const unassigned=entries.filter(event=>event.kind==="BOOKING"&&!event.bedNumber);
      const blocks=entries.filter(event=>event.kind!=="BOOKING");
      return <div key={room.id} style={{marginTop:20}}>
        <h3>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</h3>
        <p><small>{room.bedCount} camas cadastradas • {entries.filter(event=>event.kind==="BOOKING"&&event.bedNumber).length} atribuições encontradas</small></p>
        {(unassigned.length>0||blocks.length>0)&&<p className="adminPageNote">{unassigned.length>0?unassigned.length+" reserva(s) sem cama atribuída. ":""}{blocks.length>0?"Há bloqueios ou holds neste quarto. ":""}Conferir disponibilidade antes de alocar.</p>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
          {Array.from({length:Math.min(room.bedCount,100)},(_,index)=>{
            const number=index+1;
            const assigned=entries.filter(event=>event.kind==="BOOKING"&&event.bedNumber===number);
            return <div key={number} style={{border:"1px solid #9996",borderRadius:10,padding:12}}>
              <strong>Cama {number}</strong>
              <p><small>{assigned.length?"Ocupada":unassigned.length||blocks.length?"Disponibilidade incerta":"Sem atribuição"}</small></p>
              {assigned.map(event=><div key={event.id}><Link href={"/admin/reservas/"+event.entityId}>{event.guest||event.title}</Link><p><small>{level(event.bedLevel)}</small></p></div>)}
            </div>;
          })}
        </div>
        {room.bedCount>100&&<p>Exibindo as primeiras 100 camas.</p>}
      </div>;
    })}
  </section>;
}
