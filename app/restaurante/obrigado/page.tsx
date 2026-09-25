import {getSiteLocale} from "../../../lib/site-i18n";

export default async function Page(){
  const locale=await getSiteLocale();
  const t=locale==="en"
    ?{title:"Order received!",body:"The kitchen received your order. You can follow preparation with the Moriah team.",back:"Back to menu"}
    :locale==="es"
      ?{title:"¡Pedido recibido!",body:"La cocina recibió tu pedido. Puedes acompañar la preparación con el equipo de Moriah.",back:"Volver al menú"}
      :{title:"Pedido recebido!",body:"A cozinha recebeu seu pedido. Você pode acompanhar a preparação com a equipe da pousada.",back:"Voltar ao cardápio"};
  return <main style={{padding:"15vh 6vw",textAlign:"center"}}>
    <small>MORIAH FOOD</small>
    <h1 style={{fontSize:58}}>{t.title}</h1>
    <p>{t.body}</p>
    <a href="/restaurante" style={{fontWeight:900}}>{t.back}</a>
  </main>;
}