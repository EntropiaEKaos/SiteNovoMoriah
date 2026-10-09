import "server-only";
import {signSmoobuRequest} from "./smoobu-client";

export type SmoobuDailyRate={apartmentId:number;date:string;priceCents:number|null;minNights:number|null;available:number|null};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
export function parseSmoobuRates(payload:unknown,apartments:number[]):SmoobuDailyRate[]{
 if(!payload||typeof payload!=="object"||!("data" in payload))throw new Error("Resposta de tarifas Smoobu inválida.");
 const data=(payload as {data:unknown}).data;
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Tabela de tarifas inválida.");
 const results:SmoobuDailyRate[]=[];
 for(const [id,dates] of Object.entries(data)){
  const apartmentId=Number(id);
  if(!apartments.includes(apartmentId)||!dates||typeof dates!=="object"||Array.isArray(dates))throw new Error("Unidade de tarifa desconhecida.");
  for(const [date,raw] of Object.entries(dates)){
   if(!datePattern.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z"))||!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Data ou tarifa inválida.");
   const item=raw as Record<string,unknown>;
   const price=item.price;
   const priceCents=price===null?null:typeof price==="number"&&Number.isFinite(price)&&price>=0&&price<=1000000?Math.round(price*100):NaN;
   if(Number.isNaN(priceCents))throw new Error("Preço externo inválido.");
   const min=item.min_length_of_stay;
   const available=item.available;
   if(min!==null&&min!==undefined&&(!Number.isInteger(min)||Number(min)<0))throw new Error("Estadia mínima inválida.");
   if(available!==null&&available!==undefined&&(!Number.isInteger(available)||Number(available)<0))throw new Error("Disponibilidade inválida.");
   results.push({apartmentId,date,priceCents,minNights:typeof min==="number"?min:null,available:typeof available==="number"?available:null});
  }
 }
 return results.sort((a,b)=>a.date.localeCompare(b.date)||a.apartmentId-b.apartmentId);
}
export async function getSmoobuDailyRates(apartments:number[],days=90):Promise<SmoobuDailyRate[]>{
 if(apartments.length===0)return [];
 if(apartments.length>100||apartments.some(id=>!Number.isSafeInteger(id)||id<=0)||days<1||days>90)throw new Error("Consulta de tarifas fora dos limites.");
 const start=new Date();start.setUTCHours(0,0,0,0);
 const end=new Date(start);end.setUTCDate(end.getUTCDate()+days-1);
 const params=new URLSearchParams();
 for(const id of [...apartments].sort((a,b)=>a-b))params.append("apartments[]",String(id));
 params.set("end_date",end.toISOString().slice(0,10));
 params.set("start_date",start.toISOString().slice(0,10));
 const query=params.toString();
 const canonical=[...params.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv)).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&");
 const path="/api/rates";
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch("https://login.smoobu.com"+path+"?"+query,{headers:{...signSmoobuRequest("GET",path,canonical),Accept:"application/json"},cache:"no-store",signal:controller.signal});
  if(!response.ok)throw new Error("Falha ao consultar tarifas Smoobu: HTTP "+response.status);
  return parseSmoobuRates(await response.json(),apartments);
 }finally{clearTimeout(timeout);}
}
