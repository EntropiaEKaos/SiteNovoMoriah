import "server-only";
import {createHash,createHmac,randomUUID} from "node:crypto";

const API_ORIGIN="https://login.smoobu.com";
type SmoobuApartment={id:number;name:string};
type ApartmentsResponse={apartments:SmoobuApartment[]};

function credentials(){
 const key=process.env.SMOOBU_API_KEY?.trim();
 const secret=process.env.SMOOBU_API_SECRET?.trim();
 if(!key||!secret)throw new Error("Credenciais Smoobu ausentes: configure SMOOBU_API_KEY e SMOOBU_API_SECRET no servidor.");
 return {key,secret};
}

export function smoobuConfigured(){
 return Boolean(process.env.SMOOBU_API_KEY?.trim()&&process.env.SMOOBU_API_SECRET?.trim());
}

export function signSmoobuRequest(method:"GET",path:string,query=""){
 const {key,secret}=credentials();
 if(!path.startsWith("/api/")||path.includes("?"))throw new Error("Caminho Smoobu inválido.");
 const timestamp=new Date().toISOString().replace(/\.\d{3}Z$/,"Z");
 const nonce=randomUUID();
 const bodyHash=createHash("sha256").update("").digest("hex");
 const canonical=[method,path,query,timestamp,nonce,bodyHash,key].join("\n");
 const signature=createHmac("sha256",secret).update(canonical).digest("base64");
 return {"X-API-Key":key,"X-Timestamp":timestamp,"X-Nonce":nonce,"X-Signature":signature};
}

export async function getSmoobuApartments():Promise<SmoobuApartment[]>{
 const path="/api/apartments";
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(API_ORIGIN+path,{
   method:"GET",headers:{...signSmoobuRequest("GET",path),Accept:"application/json"},
   cache:"no-store",signal:controller.signal
  });
  if(!response.ok)throw new Error("Smoobu retornou HTTP "+response.status+". Verifique as credenciais, a autorização e a assinatura.");
  const payload=await response.json() as ApartmentsResponse;
  if(!payload||!Array.isArray(payload.apartments))throw new Error("Formato de acomodações Smoobu inesperado.");
  return payload.apartments.filter((item)=>Number.isSafeInteger(item.id)&&typeof item.name==="string");
 }finally{clearTimeout(timeout);}
}

/** Read-only Smoobu reservation health check. Never persists bookings or inventory. */
export async function getSmoobuReservationOverview():Promise<{total:number;page:number;pageCount:number;byApartment:Array<{id:number;name:string;count:number}>}>{
 const path="/api/reservations";
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(API_ORIGIN+path,{
   method:"GET",headers:{...signSmoobuRequest("GET",path),Accept:"application/json"},
   cache:"no-store",signal:controller.signal
  });
  if(!response.ok)throw new Error("Falha na consulta de reservas Smoobu: HTTP "+response.status);
  const payload=await response.json() as {total_items?:number;page?:number;page_count?:number;bookings?:Array<{id?:number;apartment?:{id?:number;name?:string}}>};
  if(!payload||!Array.isArray(payload.bookings)||!Number.isSafeInteger(payload.total_items)||!Number.isSafeInteger(payload.page_count))throw new Error("Resposta de reservas Smoobu inválida.");
  const counts=new Map<number,{id:number;name:string;count:number}>();
  for(const booking of payload.bookings){
   const id=booking.apartment?.id;
   if(!Number.isSafeInteger(id)||id===undefined)continue;
   const existing=counts.get(id);
   if(existing)existing.count++;
   else counts.set(id,{id,name:booking.apartment?.name||"Unidade "+id,count:1});
  }
  return {total:payload.total_items!,page:payload.page||1,pageCount:payload.page_count!,byApartment:[...counts.values()]};
 }finally{clearTimeout(timeout);}
}
