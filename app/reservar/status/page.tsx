import Link from "next/link";
import {prisma} from "../../../lib/prisma";

export const dynamic="force-dynamic";
export const metadata={title:"Situação da reserva | Moriah",robots:{index:false,follow:false}};
const labels:Record<string,{title:string;message:string;color:string}>={
 NEW:{title:"Solicitação recebida",message:"Seu pedido foi recebido e aguarda análise da nossa equipe. Ainda não é uma reserva confirmada.",color:"#f9d36b"},
 CONTACTED:{title:"Solicitação em análise",message:"Nossa equipe está analisando seu pedido. Aguarde a confirmação.",color:"#f9d36b"},
 CONFIRMED:{title:"Reserva aceita!",message:"Sua reserva foi confirmada pela equipe Moriah. Esperamos você!",color:"#83dfab"},
 CANCELLED:{title:"Reserva não aceita ou cancelada",message:"A solicitação foi cancelada. Entre em contato com a recepção para mais informações ou para tentar outras datas.",color:"#ff9999"},
 CHECKED_IN:{title:"Hospedagem iniciada",message:"Seu check-in foi registrado.",color:"#83dfab"},
 CHECKED_OUT:{title:"Hospedagem concluída",message:"Seu check-out foi registrado.",color:"#a9c8fa"},
 NO_SHOW:{title:"Não comparecimento",message:"A reserva foi marcada como não comparecimento.",color:"#ff9999"}
};
export default async function BookingStatus({searchParams}:{searchParams:Promise<{protocolo?:string}>}){
 const {protocolo}=await searchParams;
 const valid=typeof protocolo==="string"&&/^[0-9a-f-]{36}$/i.test(protocolo);
 const booking=valid?await prisma.bookingLead.findUnique({where:{publicRequestToken:protocolo},select:{status:true}}):null;
 const state=booking?labels[booking.status]||{title:"Situação em atualização",message:"Consulte novamente mais tarde.",color:"#f9d36b"}:null;
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#111",color:"#fff",padding:24}}>
  <section style={{width:"100%",maxWidth:640,background:"#1c1c1c",border:"1px solid #444",borderRadius:18,padding:28}}>
   <small style={{letterSpacing:2,color:"#ffd400"}}>MORIAH • ACOMPANHAMENTO</small>
   <h1 style={{fontSize:"clamp(28px,5vw,44px)",lineHeight:1.15}}>Situação da reserva</h1>
   {state?<div role="status" style={{borderLeft:"5px solid "+state.color,background:"#292929",borderRadius:10,padding:20,margin:"24px 0"}}><h2 style={{color:state.color,marginTop:0}}>{state.title}</h2><p style={{lineHeight:1.6}}>{state.message}</p></div>:<p style={{lineHeight:1.6,color:"#ddd"}}>Não foi possível localizar a solicitação. Utilize o link de acompanhamento recebido após o envio da reserva.</p>}
   <p style={{color:"#aaa",fontSize:13}}>Esta página mostra a situação atual registrada no sistema. Atualize a página para verificar mudanças.</p>
   <Link href="/reservar" style={{display:"inline-block",background:"#ffd400",color:"#111",padding:"13px 17px",borderRadius:8,fontWeight:800}}>Voltar às reservas</Link>
  </section>
 </main>;
}
