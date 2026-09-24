"use client";

import {useEffect} from "react";

export default function ErrorPage({
  error,
  reset
}:{
  error:Error&{digest?:string};
  reset:()=>void;
}){
  useEffect(()=>{
    console.error("PUBLIC_UI_ERROR",error);
  },[error]);

  return <main className="systemStatePage">
    <small>MORIAH / INSTABILIDADE</small>
    <h1>Não conseguimos abrir esta parte agora.</h1>
    <p>Tente novamente. Se o problema continuar, a equipe pode seguir seu atendimento pelo WhatsApp.</p>
    <div>
      <button className="sitePrimaryCta" onClick={reset}>Tentar novamente</button>
      <a className="siteSecondaryCta" href="/">Ir para o início</a>
    </div>
  </main>;
}
