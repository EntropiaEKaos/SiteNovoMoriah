"use client";

import {useMemo,useRef,useState} from "react";
import {createRateRule,updateRateRule} from "../actions";

type Room={id:string;name:string;priceCents:number|null};
type Rule={id:string;accommodationId:string;name:string;adjustmentType:string;adjustmentValue:number;startsAt:string|null;endsAt:string|null;active:boolean;priority:number;extraGuestCents:number|null;weekdaysMask:number|null};
const weekDays=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const iso=(d:Date)=>d.toISOString().slice(0,10);
const money=(c:number)=> (c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateFrom=(s:string)=>new Date(s+"T12:00:00Z");

export default function PricingCalendar({rooms,rules}:{rooms:Room[];rules:Rule[]}){
 const now=new Date();
 const [month,setMonth]=useState(new Date(Date.UTC(now.getFullYear(),now.getMonth(),1,12)));
 const [roomId,setRoomId]=useState(rooms[0]?.id??"");
 const [view,setView]=useState<"month"|"week">("month");
 const [weekIndex,setWeekIndex]=useState(0);
 const [showBase,setShowBase]=useState(true);
 const dragAnchor=useRef<string|null>(null);
 const suppressClick=useRef(false);
 const [dragging,setDragging]=useState(false);
 const [start,setStart]=useState<string|null>(null);
 const [end,setEnd]=useState<string|null>(null);
 const [price,setPrice]=useState("");
 const [name,setName]=useState("Preço pelo calendário");
 const [editingId,setEditingId]=useState("");
 const [perGuest,setPerGuest]=useState(false);
 const [guestAmount,setGuestAmount]=useState("");
 const [weekdays,setWeekdays]=useState<number[]>([0,1,2,3,4,5,6]);
 const editable=rules.filter(r=>r.accommodationId===roomId&&r.adjustmentType==="FIXED_PRICE");
 const selectRule=(id:string)=>{setEditingId(id);const r=rules.find(x=>x.id===id);if(r){setName(r.name);setPrice(String(r.adjustmentValue/100));setStart(r.startsAt?.slice(0,10)??null);setEnd(r.endsAt?.slice(0,10)??null);setPerGuest(r.extraGuestCents!=null);setGuestAmount(r.extraGuestCents!=null?String(r.extraGuestCents/100):"");setWeekdays(weekDays.map((_,i)=>i).filter(i=>r.weekdaysMask==null||(r.weekdaysMask&(1<<i))!==0));}};
 const selectedRoom=rooms.find(r=>r.id===roomId);
 const firstDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1,12));
 const offset=firstDay.getUTCDay();
 const daysInMonth=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0,12)).getUTCDate();
 const cells=useMemo(()=>Array.from({length:Math.ceil((offset+daysInMonth)/7)*7},(_,index)=>{const day=index-offset+1;return day>=1&&day<=daysInMonth?iso(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),day,12))):null}),[month,offset,daysInMonth]);
 const changeMonth=(delta:number)=>{setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+delta,1,12)));setWeekIndex(0)};
 const weekCount=Math.ceil(cells.length/7);
 const visibleCells=view==="week"?cells.slice(weekIndex*7,weekIndex*7+7):cells;
 const choose=(date:string)=>{if(suppressClick.current){suppressClick.current=false;return}if(!start||end||date<start){setStart(date);setEnd(null)}else{setEnd(date)}};
 const beginDrag=(date:string)=>{dragAnchor.current=date;setDragging(true);setStart(date);setEnd(null);suppressClick.current=true};
 const hoverDrag=(date:string)=>{if(!dragAnchor.current)return;setStart(date<dragAnchor.current?date:dragAnchor.current);setEnd(date>dragAnchor.current?date:dragAnchor.current)};
 const finishDrag=()=>{dragAnchor.current=null;setDragging(false)};
 const rangeEnd=end??start;
 const dateLabel=(d:string|null)=>d?dateFrom(d).toLocaleDateString("pt-BR",{timeZone:"UTC"}):"—";
 const selectedDays=useMemo(()=>{if(!start||!rangeEnd)return 0;let count=0;for(let timestamp=dateFrom(start).getTime();timestamp<=dateFrom(rangeEnd).getTime();timestamp+=86400000){if(weekdays.includes(new Date(timestamp).getUTCDay()))count++}return count},[start,rangeEnd,weekdays]);
 return <section className="adminSectionCard" style={{marginBottom:20}}>
  <h2>Calendário de preços 2.0</h2>
  <p>Selecione uma hospedagem e arraste o mouse sobre as datas para escolher um período, ou use dois cliques. Informe a diária e salve. Os preços exibidos são referências antes de promoções.</p>
  <div className="adminFormGrid" style={{marginBottom:16}}>
   <label>Hospedagem<select value={roomId} onChange={e=>{setRoomId(e.target.value);setStart(null);setEnd(null)}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <div style={{display:"flex",alignItems:"end",gap:8,justifyContent:"space-between"}}>
    <button type="button" onClick={()=>changeMonth(-1)} aria-label="Mês anterior">←</button>
    <strong>{month.toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})}</strong>
    <button type="button" onClick={()=>changeMonth(1)} aria-label="Próximo mês">→</button>
   </div>
  </div>
  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}><button type="button" aria-pressed={view==="month"} onClick={()=>setView("month")}>Mês</button><button type="button" aria-pressed={view==="week"} onClick={()=>setView("week")}>Semana</button><label style={{display:"flex",gap:6,alignItems:"center"}}><input type="checkbox" checked={showBase} onChange={e=>setShowBase(e.target.checked)}/> Exibir tarifa base</label></div>
  {view==="week"&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button type="button" disabled={weekIndex===0} onClick={()=>setWeekIndex(i=>Math.max(0,i-1))}>← Semana anterior</button><strong>Semana {weekIndex+1} / {weekCount}</strong><button type="button" disabled={weekIndex===weekCount-1} onClick={()=>setWeekIndex(i=>Math.min(weekCount-1,i+1))}>Próxima semana →</button></div>}
  <div onPointerUp={finishDrag} onPointerCancel={finishDrag} onPointerLeave={finishDrag} style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6,userSelect:dragging?"none":"auto"}}>
   {weekDays.map(d=><strong key={d} style={{textAlign:"center",fontSize:12}}>{d}</strong>)}
   {visibleCells.map((date,i)=>{
    if(!date)return <div key={"empty"+i}/>;
    const rule=rules.filter(r=>r.active&&r.accommodationId===roomId&&r.adjustmentType==="FIXED_PRICE"&&(!r.startsAt||r.startsAt.slice(0,10)<=date)&&(!r.endsAt||r.endsAt.slice(0,10)>=date)&&(r.weekdaysMask==null||(r.weekdaysMask&(1<<dateFrom(date).getUTCDay()))!==0)).sort((a,b)=>a.priority-b.priority)[0];
    const selected=Boolean(start&&rangeEnd&&date>=start&&date<=rangeEnd&&weekdays.includes(dateFrom(date).getUTCDay()));
    return <button key={date} type="button" onClick={()=>choose(date)} onPointerDown={e=>{if(e.pointerType==="mouse"&&e.button===0)beginDrag(date)}} onPointerEnter={()=>hoverDrag(date)} aria-pressed={selected} title={rule?.name??"Tarifa base"} style={{minHeight:view==="week"?108:86,padding:"9px 3px",borderRadius:12,border:selected?"2px solid #bd8124":"1px solid #ddd",background:selected?"#fff0d5":rule?"#e6f4e8":"#fff",color:"#222",cursor:"pointer"}}>
     <span style={{display:"block",fontWeight:700}}>{Number(date.slice(-2))}</span>
     <span style={{display:"block",fontSize:12,fontWeight:700,overflowWrap:"anywhere"}}>{rule?money(rule.adjustmentValue):showBase&&selectedRoom?.priceCents!=null?money(selectedRoom.priceCents):"—"}</span>
    </button>;
   })}
  </div>
  <p style={{fontSize:12,marginTop:10}}>🟢 Verde: diária definida · ⬜ Branco: tarifa base · 🟨 Amarelo: período selecionado. Outras regras e promoções podem alterar a cotação real.</p>
  <div role="status" aria-live="polite" style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"center",padding:16,marginTop:18,borderRadius:14,background:"#f6f2e9",border:"1px solid #e5d6b9"}}><div><small style={{display:"block"}}>Período selecionado</small><strong>{start?dateLabel(start)+" → "+dateLabel(rangeEnd):"Selecione as datas"}</strong></div><div><small style={{display:"block"}}>Diárias afetadas</small><strong>{selectedDays}</strong></div><div><small style={{display:"block"}}>Novo valor por diária</small><strong>{Number(price)>0?money(Math.round(Number(price)*100)):"—"}</strong></div><div><small style={{display:"block"}}>Hospedagem</small><strong>{selectedRoom?.name??"—"}</strong></div></div>
  <form action={editingId?updateRateRule:createRateRule} className="adminFormGrid" style={{marginTop:16}}>
   <label className="span2">Editar preço existente ou criar novo<select value={editingId} onChange={e=>selectRule(e.target.value)}><option value="">Nova regra de preço</option>{editable.map(r=><option key={r.id} value={r.id}>{r.name} — {r.startsAt?.slice(0,10)??"sem início"} a {r.endsAt?.slice(0,10)??"sem fim"}</option>)}</select></label>
   {editingId&&<input type="hidden" name="id" value={editingId}/>}
   <input type="hidden" name="perGuest" value={perGuest?"on":"off"}/>
   <input type="hidden" name="accommodationId" value={roomId}/>
   <input type="hidden" name="adjustmentType" value="FIXED_PRICE"/>
   <input type="hidden" name="priority" value="0"/>
   <input type="hidden" name="startsAt" value={start??""}/>
   <input type="hidden" name="endsAt" value={rangeEnd??""}/>
   <label>Período escolhido<input readOnly value={start?dateLabel(start)+" até "+dateLabel(rangeEnd):"Selecione as datas no calendário"}/></label>
   <label>Diária final (R$)<input name="adjustmentValue" type="number" step="0.01" min="0.01" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Ex.: 180.00"/></label>
   <fieldset className="span2" style={{border:"1px solid #ddd",borderRadius:8,padding:12}}><legend>Dias da semana que receberão o novo preço</legend><div style={{display:"flex",flexWrap:"wrap",gap:12}}>{weekDays.map((label,i)=><label key={i} style={{display:"flex",alignItems:"center",gap:5}}><input type="checkbox" name="weekdays" value={i} checked={weekdays.includes(i)} onChange={e=>setWeekdays(current=>e.target.checked?[...current,i]:current.filter(v=>v!==i))}/>{label}</label>)}</div><small>Selecione um ou mais dias. A regra se repetirá semanalmente somente no período escolhido.</small></fieldset>
   <label className="span2">Adicional por hóspede (opcional)<span style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={perGuest} onChange={e=>setPerGuest(e.target.checked)}/> Cobrar por hóspede extra em quarto privativo</span></label>
   {perGuest&&<label className="span2">Valor por hóspede extra / noite (R$)<input name="extraGuestAmount" type="number" step="0.01" min="0" required value={guestAmount} onChange={e=>setGuestAmount(e.target.value)} placeholder="Ex.: 30.00"/></label>}
   <label className="span2">Nome da regra<input name="name" required value={name} onChange={e=>setName(e.target.value)}/></label>
   <button className="span2" disabled={!roomId||!start||!price||Number(price)<=0||selectedDays===0}>{editingId?"Salvar alterações da regra":"Salvar preço nas datas selecionadas"}</button>
  </form>
 </section>;
}
