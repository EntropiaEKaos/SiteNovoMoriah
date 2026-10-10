"use client";
import {useState} from "react";
import styles from "./booking-bed-picker.module.css";

type Occupant={id:string;number:number;level:string|null;name:string;start:string;end:string};
export default function BookingBedPicker({count,initialNumber,initialLevel,occupants,roomName,pendingBookings,pendingHolds}:{pendingBookings:number;pendingHolds:number;count:number;initialNumber:number|null;initialLevel:string|null;occupants:Occupant[];roomName:string}){
 const [number,setNumber]=useState<number|null>(initialNumber);
 const [level,setLevel]=useState(initialLevel||"");
 const occupied=new Map<number,Occupant[]>();
 for(const item of occupants){const list=occupied.get(item.number)||[];list.push(item);occupied.set(item.number,list)}
 const selectedOccupants=number?occupied.get(number)||[]:[];
 const conflict=number!==null&&selectedOccupants.some(item=>item.level===level);
 const unresolved=pendingBookings>0||pendingHolds>0;
 const formatDate=(date:string)=>date?date.split("-").reverse().join("/"):"Data não informada";
 return <section className={styles.wrapper} aria-label="Selecionar cama do hostel">
  <div className={styles.head}><div><small>HOSTEL • QUARTO COMPARTILHADO</small><h3>Escolha a cama</h3><p>{roomName} · Clique no leito desejado e selecione a altura.</p></div><span>{count} camas</span></div>
  <div className={styles.legend}><span>● Sem atribuição</span><span>● Ocupada</span><span>● Selecionada</span></div>
  {unresolved&&<p className={styles.warning} role="status">Atenção: {pendingBookings} reserva(s) confirmada(s) sem cama definida e {pendingHolds} bloqueio(s) temporário(s) no período. A disponibilidade precisa de conferência.</p>}
  <div className={styles.grid}>
   {Array.from({length:Math.min(count,100)},(_,index)=>{const bed=index+1;const taken=occupied.has(bed);return <button key={bed} type="button" aria-pressed={number===bed} aria-label={`Cama ${bed}${taken?", com reserva atribuída":""}`} className={[styles.bed,taken?styles.taken:"",number===bed?styles.selected:""].join(" ")} onClick={()=>{setNumber(bed);if((occupied.get(bed)||[]).some(item=>item.level===level))setLevel("")}}><span className={styles.pillow}/><strong>{String(bed).padStart(2,"0")}</strong><small>{taken?"OCUPADA":"SEM ATRIB."}</small></button>})}
  </div>
  {count>100&&<p>Exibindo os primeiros 100 leitos.</p>}
  <div className={styles.selection}>
   <div><strong>{number?"Cama "+number:"Nenhuma cama selecionada"}</strong><p>{selectedOccupants.length?selectedOccupants.map(item=>item.name+" ("+(item.level||"altura não definida")+", "+formatDate(item.start)+" a "+formatDate(item.end)+")").join(", "):"Sem atribuição de cama encontrada no período."}</p></div>
   <label>Altura<select name="bedLevel" value={number?level:""} onChange={event=>setLevel(event.target.value)} required={number!==null} disabled={number===null}><option value="">Selecione a altura</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option></select></label>
   <input type="hidden" name="bedNumber" value={number??""}/>
   <button type="button" className={styles.clear} onClick={()=>{setNumber(null);setLevel("")}}>Limpar cama</button>
  </div>
  {conflict&&<p className={styles.warning} role="alert">Essa cama e altura já estão atribuídas a outra reserva neste período. Escolha outra opção.</p>}
  <p className={styles.note}>O mapa considera todo o período da reserva, não apenas hoje. Uma cama ocupada pode ter outra altura livre; confira o detalhe antes de selecionar. Canais externos ainda não estão sincronizados automaticamente. A validação final acontece ao salvar.</p>
 </section>;
}
