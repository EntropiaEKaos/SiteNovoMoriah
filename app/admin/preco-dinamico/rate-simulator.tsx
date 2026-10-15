"use client";
import {useState} from "react";
type Room={id:string;name:string;capacity:number};
type Result={available?:boolean;quote?:{totalCents?:number};error?:string};
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
    <strong>Valor da estadia: {typeof result.quote?.totalCents==="number"?(result.quote.totalCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"Sob consulta"}</strong>
    <p>{result.available?"Disponível":"Indisponível"} no período selecionado. Simulação sujeita a alterações de tarifas e disponibilidade.</p>
   </>}
  </div>}
 </section>;
}
