"use client";
import {useState} from "react";
type Room={id:string;name:string;capacity:number};
type Quote={totalCents?:number;subtotalCents?:number;discountCents?:number;nights?:number;averageNightCents?:number;ratePlan?:string;appliedRules?:string[];appliedPromotions?:string[];breakdown?:{date:string;priceCents:number;override:boolean}[]};
type Result={available?:boolean;quote?:Quote|null;error?:string};
const money=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateAfter=(days:number)=>{const date=new Date();date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
export default function RateSimulator({rooms}:{rooms:Room[]}){
 const [roomId,setRoomId]=useState(rooms[0]?.id||"");
 const [checkIn,setCheckIn]=useState(dateAfter(1));
 const [checkOut,setCheckOut]=useState(dateAfter(2));
 const [guests,setGuests]=useState(1);
 const [loading,setLoading]=useState(false);
 const [result,setResult]=useState<Result|null>(null);
 const room=rooms.find(item=>item.id===roomId);
 async function simulate(){
  setResult(null);
  if(!roomId||!checkIn||checkOut<=checkIn||guests<1||guests>(room?.capacity||0)){setResult({error:"Informe datas e hóspedes válidos."});return;}
  setLoading(true);
  try{
   const params=new URLSearchParams({accommodationId:roomId,checkIn,checkOut,guests:String(guests)});
   const response=await fetch("/api/rates/quote?"+params,{cache:"no-store"});
   const data=await response.json() as Result;
   setResult(response.ok?data:{error:data.error||"Não foi possível calcular."});
  }catch{setResult({error:"Falha ao consultar tarifas."});}
  finally{setLoading(false);}
 }
 return <section className="adminSectionCard" style={{marginBottom:20}}>
  <h2>Simulador de tarifas</h2>
  <p>Confira o preço publicado e a disponibilidade sem criar ou alterar regras.</p>
  <div className="adminFormGrid cols3">
   <label className="span2">Hospedagem<select value={roomId} onChange={e=>{setRoomId(e.target.value);setResult(null);}}>{rooms.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Hóspedes / camas<input type="number" min={1} max={room?.capacity||1} value={guests} onChange={e=>{setGuests(Number(e.target.value));setResult(null);}}/></label>
   <label>Check-in<input type="date" value={checkIn} onChange={e=>{setCheckIn(e.target.value);setResult(null);}}/></label>
   <label>Check-out<input type="date" value={checkOut} onChange={e=>{setCheckOut(e.target.value);setResult(null);}}/></label>
   <button type="button" disabled={loading||!roomId} onClick={simulate}>{loading?"Calculando...":"Simular preço"}</button>
  </div>
  {result&&<div aria-live="polite" style={{marginTop:16,padding:16,border:"1px solid #ddd",borderRadius:12}}>
   {result.error?<strong>{result.error}</strong>:<>
    <strong>Valor da estadia: {typeof result.quote?.totalCents==="number"?money(result.quote.totalCents):"Sob consulta"}</strong>
   {result.quote&&<>
    <p>Plano: {result.quote.ratePlan||"Tarifa padrão"} • {result.quote.nights??0} diária(s)</p>
    {!!result.quote.breakdown?.length&&<div style={{overflowX:"auto",marginTop:12}}>
     <table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}>
      <thead><tr><th style={{padding:8}}>Noite</th><th style={{padding:8}}>Diária</th><th style={{padding:8}}>Origem</th></tr></thead>
      <tbody>{result.quote.breakdown.map(night=><tr key={night.date}><td style={{padding:8,borderTop:"1px solid #ddd"}}>{new Date(night.date+"T12:00:00Z").toLocaleDateString("pt-BR",{timeZone:"UTC"})}</td><td style={{padding:8,borderTop:"1px solid #ddd"}}>{money(night.priceCents)}</td><td style={{padding:8,borderTop:"1px solid #ddd"}}>{night.override?"Tarifa sazonal":"Tarifa calculada"}</td></tr>)}</tbody>
     </table>
    </div>}
    {typeof result.quote.subtotalCents==="number"&&<p>Subtotal: {money(result.quote.subtotalCents)}</p>}
    {typeof result.quote.discountCents==="number"&&<p>Descontos: − {money(result.quote.discountCents)}</p>}
    {typeof result.quote.totalCents==="number"&&<p><strong>Total: {money(result.quote.totalCents)}</strong></p>}
    {typeof result.quote.averageNightCents==="number"&&<p>Média por noite: {money(result.quote.averageNightCents)}</p>}
    {!!result.quote.appliedRules?.length&&<p>Regras aplicadas: {result.quote.appliedRules.join(", ")}</p>}
    {!!result.quote.appliedPromotions?.length&&<p>Promoções: {result.quote.appliedPromotions.join(", ")}</p>}
   </>}
    <p>{result.available?"Disponível":"Indisponível"} no período selecionado. Simulação sujeita a alterações de tarifas e disponibilidade.</p>
   </>}
  </div>}
 </section>;
}
