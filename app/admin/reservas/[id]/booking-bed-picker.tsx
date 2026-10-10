"use client";
import {useState} from "react";
import styles from "./booking-bed-picker.module.css";

type Occupant={id:string;number:number;level:string|null;name:string;start:string;end:string};
export default function BookingBedPicker({count,initialNumber,initialLevel,occupants,roomName,pendingBookings,pendingHolds}:{pendingBookings:number;pendingHolds:number;count:number;initialNumber:number|null;initialLevel:string|null;occupants:Occupant[];roomName:string}){
 const levels=[{id:"BAIXA",label:"Baixa"},{id:"MEDIA",label:"Média"},{id:"ALTA",label:"Alta"}] as const;
 const bunkCount=Math.ceil(count/3);
 // Legacy bookings used a bed index from 1..18. Do not silently remap those records.
 const legacy=initialNumber!==null&&initialNumber>bunkCount;
 const [number,setNumber]=useState<number|null>(legacy?null:initialNumber);
 const [level,setLevel]=useState(legacy?"":initialLevel||"");
 const occupied=new Map<string,Occupant>();
 const legacyOccupants:Occupant[]=[];
 for(const item of occupants){
   if(item.number>bunkCount||!item.level){legacyOccupants.push(item);continue;}
   occupied.set(item.number+":"+item.level,item);
 }
 const pending=pendingBookings+pendingHolds+legacyOccupants.length+(legacy?1:0);
 const selectedKey=number!==null&&level?number+":"+level:"";
 const conflict=Boolean(selectedKey&&occupied.has(selectedKey));
 const formatDate=(date:string)=>date?date.split("-").reverse().join("/"):"Data não informada";
 return <section className={styles.wrapper} aria-label="Selecionar leito do triliche">
  <div className={styles.head}><div><small>HOSTEL • 3 LEITOS POR TRILICHE</small><h3>Escolha o leito físico</h3><p>{roomName} · {bunkCount} triliches · {count} vagas. Selecione uma altura específica.</p></div><span>{count} leitos</span></div>
  <div className={styles.legend}><span>● Sem atribuição</span><span>● Ocupado</span><span>● Desta reserva</span></div>
  {pending>0&&<p className={styles.warning} role="alert">{pending} pendência(s) de atribuição ou bloqueio no período. Reservas antigas com numeração de cama de 1 a 18 não são convertidas automaticamente: confira os leitos antes de confirmar.</p>}
  {legacy&&<p className={styles.warning} role="alert">Esta reserva usa a numeração antiga (cama {initialNumber} — {initialLevel||"sem altura"}). Escolha manualmente um dos {bunkCount} triliches e a altura correta para atualizar o cadastro.</p>}
  <div className={styles.grid}>
   {Array.from({length:bunkCount},(_,index)=>{
    const bunk=index+1;
    return <div key={bunk} className={styles.bunk}>
      <strong>Triliche {String(bunk).padStart(2,"0")}</strong>
      {levels.map(item=>{
       const key=bunk+":"+item.id;
       const occupant=occupied.get(key);
       const mine=!legacy&&initialNumber===bunk&&initialLevel===item.id;
       const selected=number===bunk&&level===item.id;
       return <button key={key} type="button" disabled={Boolean(occupant)&&!mine} aria-pressed={selected} aria-label={`Triliche ${bunk}, ${item.label}, ${mine?"desta reserva":occupant?"ocupado":"sem atribuição"}`} className={[styles.bed,occupant?styles.taken:"",mine?styles.mine:"",selected?styles.selected:""].join(" ")} onClick={()=>{setNumber(bunk);setLevel(item.id)}}>
        <strong>{item.label}</strong><small>{mine?"DESTA RESERVA":occupant?"OCUPADO":"DISPONÍVEL"}</small>
       </button>;
      })}
    </div>;
   })}
  </div>
  <div className={styles.selection}>
   <div><strong>{number&&level?`Triliche ${number} — ${levels.find(item=>item.id===level)?.label}`:"Nenhum leito selecionado"}</strong><p>{conflict?"Leito ocupado por outra reserva no período.":"A atribuição será gravada ao clicar em Salvar reserva no fim do formulário."}</p></div>
   <input type="hidden" name="bedNumber" value={number??""}/>
   <input type="hidden" name="bedLevel" value={number?level:""}/>
   <button type="button" className={styles.clear} onClick={()=>{setNumber(null);setLevel("")}}>Limpar seleção</button>
  </div>
  {conflict&&<p className={styles.warning} role="alert">Leito já atribuído a outra reserva neste período.</p>}
  <p className={styles.note}>Uma combinação triliche + altura corresponde a exatamente uma vaga. A ocupação considera o período completo; reservas antigas sem atribuição precisam de conferência.</p>
 </section>;
}
