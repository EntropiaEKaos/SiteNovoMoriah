"use client";
import {useState} from "react";
import styles from "./booking-bed-picker.module.css";

type Occupant={id:string;number:number;level:string|null;name:string};
export default function BookingBedPicker({count,initialNumber,initialLevel,occupants,roomName}:{count:number;initialNumber:number|null;initialLevel:string|null;occupants:Occupant[];roomName:string}){
 const [number,setNumber]=useState<number|null>(initialNumber);
 const [level,setLevel]=useState(initialLevel||"");
 const occupied=new Map<number,Occupant[]>();
 for(const item of occupants){const list=occupied.get(item.number)||[];list.push(item);occupied.set(item.number,list)}
 const selectedOccupants=number?occupied.get(number)||[]:[];
 const conflict=number!==null&&selectedOccupants.some(item=>item.level===level);
 return <section className={styles.wrapper} aria-label="Selecionar cama do hostel">
  <div className={styles.head}><div><small>HOSTEL • QUARTO COMPARTILHADO</small><h3>Escolha a cama</h3><p>{roomName} · Clique no leito desejado e selecione a altura.</p></div><span>{count} camas</span></div>
  <div className={styles.legend}><span>● Sem atribuição</span><span>● Ocupada</span><span>● Selecionada</span></div>
  <div className={styles.grid}>
   {Array.from({length:Math.min(count,100)},(_,index)=>{const bed=index+1;const taken=occupied.has(bed);return <button key={bed} type="button" aria-pressed={number===bed} aria-label={`Cama ${bed}${taken?", com reserva atribuída":""}`} className={[styles.bed,taken?styles.taken:"",number===bed?styles.selected:""].join(" ")} onClick={()=>{setNumber(bed);if((occupied.get(bed)||[]).some(item=>item.level===level))setLevel("")}}><span className={styles.pillow}/><strong>{String(bed).padStart(2,"0")}</strong><small>{taken?"OCUPADA":"SEM ATRIB."}</small></button>})}
  </div>
  {count>100&&<p>Exibindo os primeiros 100 leitos.</p>}
  <div className={styles.selection}>
   <div><strong>{number?"Cama "+number:"Nenhuma cama selecionada"}</strong><p>{selectedOccupants.length?selectedOccupants.map(item=>item.name+" ("+(item.level||"altura não definida")+")").join(", "):"Sem atribuição de cama encontrada no período."}</p></div>
   <label>Altura<select name="bedLevel" value={number?level:""} onChange={event=>setLevel(event.target.value)} required={number!==null} disabled={number===null}><option value="">Selecione a altura</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option></select></label>
   <input type="hidden" name="bedNumber" value={number??""}/>
   <button type="button" className={styles.clear} onClick={()=>{setNumber(null);setLevel("")}}>Limpar cama</button>
  </div>
  {conflict&&<p className={styles.warning} role="alert">Essa cama e altura já estão atribuídas a outra reserva neste período. Escolha outra opção.</p>}
  <p className={styles.note}>A visualização considera reservas confirmadas e check-ins no período. Outras reservas sem cama, holds e canais externos podem afetar a disponibilidade. A validação final acontece ao salvar.</p>
 </section>;
}
