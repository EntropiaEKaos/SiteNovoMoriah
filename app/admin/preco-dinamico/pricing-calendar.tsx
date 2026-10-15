"use client";

import {useMemo,useState} from "react";
import {createRateRule} from "../actions";

type Room={id:string;name:string;priceCents:number|null};
type Rule={id:string;accommodationId:string;name:string;adjustmentType:string;adjustmentValue:number;startsAt:string|null;endsAt:string|null;active:boolean;priority:number};
const iso=(d:Date)=>d.toISOString().slice(0,10);
const money=(c:number)=> (c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateFrom=(s:string)=>new Date(s+"T12:00:00Z");

export default function PricingCalendar({rooms,rules}:{rooms:Room[];rules:Rule[]}){
 const now=new Date();
 const [month,setMonth]=useState(new Date(Date.UTC(now.getFullYear(),now.getMonth(),1,12)));
 const [roomId,setRoomId]=useState(rooms[0]?.id??"");
 const [start,setStart]=useState<string|null>(null);
 const [end,setEnd]=useState<string|null>(null);
 const [price,setPrice]=useState("");
 const [name,setName]=useState("Preço pelo calendário");
 const selectedRoom=rooms.find(r=>r.id===roomId);
 const firstDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1,12));
 const offset=firstDay.getUTCDay();
 const daysInMonth=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0,12)).getUTCDate();
 const cells=useMemo(()=>Array.from({length:Math.ceil((offset+daysInMonth)/7)*7},(_,index)=>{const day=index-offset+1;return day>=1&&day<=daysInMonth?iso(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),day,12))):null}),[month,offset,daysInMonth]);
 const changeMonth=(delta:number)=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+delta,1,12)));
 const choose=(date:string)=>{if(!start||end||date<start){setStart(date);setEnd(null)}else{setEnd(date)}};
 const rangeEnd=end??start;
 const dateLabel=(d:string|null)=>d?dateFrom(d).toLocaleDateString("pt-BR",{timeZone:"UTC"}):"—";
 return <section className="adminSectionCard" style={{marginBottom:20}}>
  <h2>Calendário de preços</h2>
  <p>Escolha a hospedagem, clique no primeiro e no último dia, informe a diária final e salve. Os valores no calendário são referências antes de promoções e condições especiais.</p>
  <div className="adminFormGrid" style={{marginBottom:16}}>
   <label>Hospedagem<select value={roomId} onChange={e=>{setRoomId(e.target.value);setStart(null);setEnd(null)}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <div style={{display:"flex",alignItems:"end",gap:8,justifyContent:"space-between"}}>
    <button type="button" onClick={()=>changeMonth(-1)} aria-label="Mês anterior">←</button>
    <strong>{month.toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})}</strong>
    <button type="button" onClick={()=>changeMonth(1)} aria-label="Próximo mês">→</button>
   </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:4}}>
   {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><strong key={d} style={{textAlign:"center",fontSize:12}}>{d}</strong>)}
   {cells.map((date,i)=>{
    if(!date)return <div key={"empty"+i}/>;
    const rule=rules.filter(r=>r.active&&r.accommodationId===roomId&&r.adjustmentType==="FIXED_PRICE"&&(!r.startsAt||r.startsAt.slice(0,10)<=date)&&(!r.endsAt||r.endsAt.slice(0,10)>=date)).sort((a,b)=>a.priority-b.priority)[0];
    const selected=Boolean(start&&rangeEnd&&date>=start&&date<=rangeEnd);
    return <button key={date} type="button" onClick={()=>choose(date)} aria-pressed={selected} title={rule?.name??"Tarifa base"} style={{minHeight:68,padding:"6px 2px",borderRadius:8,border:selected?"2px solid #bd8124":"1px solid #ddd",background:selected?"#fff0d5":rule?"#e6f4e8":"#fff",color:"#222",cursor:"pointer"}}>
     <span style={{display:"block",fontWeight:700}}>{Number(date.slice(-2))}</span>
     <span style={{display:"block",fontSize:11,overflowWrap:"anywhere"}}>{rule?money(rule.adjustmentValue):selectedRoom?.priceCents!=null?money(selectedRoom.priceCents):"—"}</span>
    </button>;
   })}
  </div>
  <p style={{fontSize:12,marginTop:10}}>Verde: diária final cadastrada. Branco: tarifa base de referência. Destaque: período selecionado. Outras regras e promoções podem alterar a cotação real.</p>
  <form action={createRateRule} className="adminFormGrid" style={{marginTop:16}}>
   <input type="hidden" name="accommodationId" value={roomId}/>
   <input type="hidden" name="adjustmentType" value="FIXED_PRICE"/>
   <input type="hidden" name="priority" value="0"/>
   <input type="hidden" name="startsAt" value={start??""}/>
   <input type="hidden" name="endsAt" value={rangeEnd??""}/>
   <label>Período escolhido<input readOnly value={start?dateLabel(start)+" até "+dateLabel(rangeEnd):"Selecione as datas no calendário"}/></label>
   <label>Diária final (R$)<input name="adjustmentValue" type="number" step="0.01" min="0.01" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Ex.: 180.00"/></label>
   <label className="span2">Nome da regra<input name="name" required value={name} onChange={e=>setName(e.target.value)}/></label>
   <button className="span2" disabled={!roomId||!start||!price||Number(price)<=0}>Salvar preço nas datas selecionadas</button>
  </form>
 </section>;
}
