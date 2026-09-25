import Link from "next/link";
import {getSiteLocale} from "../../../lib/site-i18n";

export default async function Page(){
  const locale=await getSiteLocale();
  const t=locale==="en"
    ?{title:"Request received",body:"We received your stay request. Our team can continue the service using the information you provided.",back:"Back to website"}
    :locale==="es"
      ?{title:"Solicitud recibida",body:"Recibimos tu solicitud de hospedaje. Nuestro equipo podrá continuar la atención con los datos informados.",back:"Volver al sitio"}
      :{title:"Pedido recebido",body:"Recebemos sua solicitação de hospedagem. Nossa equipe poderá continuar o atendimento pelos dados informados.",back:"Voltar ao site"};
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:30,background:"#111",color:"#fff"}}>
    <section style={{maxWidth:700}}>
      <small>POUSADA MORIAH</small>
      <h1 style={{fontSize:"clamp(48px,8vw,86px)",lineHeight:.95}}>{t.title}<span style={{color:"#ffd400"}}>.</span></h1>
      <p style={{fontSize:19,lineHeight:1.6,color:"#ccc"}}>{t.body}</p>
      <Link href="/" style={{display:"inline-block",background:"#ffd400",color:"#111",padding:"15px 20px",fontWeight:800}}>{t.back}</Link>
    </section>
  </main>;
}