"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import styles from "./shared-bed-map.module.css";

type Room={id:string;name:string;roomNumber:string|null;bedCount:number;sharedRoom:boolean};
type Event={id:string;entityId:string;roomId:string;kind:string;start:string;end:string;guest:string|null;title:string;bedNumber?:number|null;bedLevel?:string|null};
const datePart=(value:string)=>value.slice(0,10);
const level=(value:string|null|undefined)=>value==="BAIXA"?"Baixa":value==="MEDIA"?"Média":value==="ALTA"?"Alta":"Não informada";
const isoToday=()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const changeDay=(day:string,offset:number)=>{const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10)};

export default function SharedBedMap({rooms,events}:{rooms:Room[];events:Event[]}){
  const shared=useMemo(()=>rooms.filter(room=>room.sharedRoom&&room.bedCount>0),[rooms]);
  const [selectedDay,setSelectedDay]=useState(isoToday);
  const [selectedRoom,setSelectedRoom]=useState("");
  const [selectedBed,setSelectedBed]=useState(1);
  const room=shared.find(item=>item.id===selectedRoom)||shared[0];
  const entries=events.filter(event=>room&&event.roomId===room.id&&datePart(event.start)<=selectedDay&&datePart(event.end)>selectedDay);
  const bookings=entries.filter(event=>event.kind==="BOOKING");
  const unassigned=bookings.filter(event=>!event.bedNumber);
  const blocks=entries.filter(event=>event.kind!=="BOOKING");
  const occupiedNumbers=new Set(bookings.filter(event=>event.bedNumber).map(event=>event.bedNumber));
  const occupiedCount=occupiedNumbers.size;
  const chosen=room?Math.min(Math.max(1,selectedBed),room.bedCount):1;
  const assigned=bookings.filter(event=>event.bedNumber===chosen);
  const uncertain=unassigned.length>0||blocks.length>0;
  if(!room)return null;
  return <section className={styles.panel} aria-label="Mapa de camas dos quartos compartilhados" id="mapa-de-camas">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>MORIAH • MAPA DE LEITOS</span><h2>Escolha uma cama</h2><p>Visualize a ocupação como em um mapa de assentos. Clique em um leito para consultar os detalhes.</p></div>
      <Link href="/admin/reservas" className={styles.action}>Ver reservas ↗</Link>
    </header>
    <div className={styles.controls}>
      <label>Quarto<select value={room.id} onChange={event=>{setSelectedRoom(event.target.value);setSelectedBed(1)}}>{shared.map(item=><option key={item.id} value={item.id}>{item.roomNumber?item.roomNumber+" · ":""}{item.name}</option>)}</select></label>
      <div className={styles.dateControl}><button type="button" aria-label="Dia anterior" onClick={()=>setSelectedDay(changeDay(selectedDay,-1))}>‹</button><label>Data<input type="date" value={selectedDay} onChange={event=>setSelectedDay(event.target.value)}/></label><button type="button" aria-label="Próximo dia" onClick={()=>setSelectedDay(changeDay(selectedDay,1))}>›</button></div>
      <button type="button" className={styles.today} onClick={()=>setSelectedDay(isoToday())}>Hoje</button>
    </div>
    <div className={styles.stats}>
      <div><strong>{room.bedCount}</strong><span>Camas cadastradas</span></div>
      <div><strong>{occupiedCount}</strong><span>Com reserva atribuída</span></div>
      <div><strong>{Math.max(0,room.bedCount-occupiedCount)}</strong><span>Sem atribuição</span></div>
    </div>
    <div className={styles.legend} aria-label="Legenda"><span><i className={styles.free}/> Sem atribuição</span><span><i className={styles.busy}/> Ocupada</span><span><i className={styles.chosen}/> Selecionada</span>{uncertain&&<span><i className={styles.warning}/> Conferir</span>}</div>
    {uncertain&&<div className={styles.alert} role="status"><strong>Conferência necessária.</strong> {unassigned.length>0?`${unassigned.length} reserva(s) ainda não têm cama definida. `:""}{blocks.length>0?"Há bloqueios ou holds no quarto. ":""}A ausência de atribuição não garante disponibilidade real.</div>}
    <div className={styles.layout}>
      <div className={styles.cabin}>
        <div className={styles.cabinTop}><span>QUARTO {room.roomNumber||room.name}</span><span>{room.bedCount} LEITOS</span></div>
        <div className={styles.seatGrid}>
          {Array.from({length:Math.min(room.bedCount,100)},(_,index)=>{
            const number=index+1;
            const occupied=occupiedNumbers.has(number);
            const active=chosen===number;
            return <button key={number} type="button" aria-pressed={active} aria-label={`Cama ${number}: ${occupied?"ocupada":uncertain?"conferir disponibilidade":"sem atribuição"}`} onClick={()=>setSelectedBed(number)} className={[styles.seat,occupied?styles.seatBusy:uncertain?styles.seatUncertain:styles.seatFree,active?styles.seatActive:""].join(" ")}>
              <span className={styles.pillow}/><strong>{String(number).padStart(2,"0")}</strong><small>{occupied?"OCUPADA":uncertain?"CONFERIR":"SEM ATRIB."}</small>
            </button>;
          })}
        </div>
        {room.bedCount>100&&<p>Exibindo os primeiros 100 leitos.</p>}
        <div className={styles.cabinFoot}>Clique em uma cama para consultar a reserva e sua altura.</div>
      </div>
      <aside className={styles.detail} aria-live="polite">
        <span className={styles.eyebrow}>LEITO SELECIONADO</span>
        <div className={styles.detailNumber}>{String(chosen).padStart(2,"0")}</div>
        <h3>Cama {chosen}</h3>
        <span className={assigned.length?styles.statusBusy:styles.statusFree}>{assigned.length?"Ocupada":uncertain?"Conferir disponibilidade":"Sem reserva atribuída"}</span>
        {assigned.length?assigned.map(event=><div className={styles.booking} key={event.id}><span>Hóspede</span><strong>{event.guest||event.title}</strong><span>Altura</span><strong>{level(event.bedLevel)}</strong><span>Período</span><strong>{datePart(event.start).split("-").reverse().join("/")} a {datePart(event.end).split("-").reverse().join("/")}</strong><Link className={styles.primary} href={"/admin/reservas/"+event.entityId}>Abrir reserva e editar cama →</Link></div>):<div className={styles.booking}><p>Não há reserva com esta cama atribuída na data selecionada.</p>{uncertain&&<p>Existem reservas sem cama ou bloqueios que exigem conferência.</p>}<Link href="/admin/reservas" className={styles.primary}>Consultar reservas →</Link></div>}
        <p className={styles.hint}>Para atribuir ou trocar uma cama, abra a reserva, escolha o número e a altura e salve. O sistema valida conflitos no servidor.</p>
      </aside>
    </div>
  </section>;
}
