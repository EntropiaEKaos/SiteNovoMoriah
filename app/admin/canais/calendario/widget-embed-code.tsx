"use client";

import {useEffect,useState} from "react";

export default function WidgetEmbedCode({token}:{token:string}){
  const [origin,setOrigin]=useState("");
  const [copied,setCopied]=useState(false);
  useEffect(()=>setOrigin(window.location.origin),[]);
  const src=(origin||"https://SEU-DOMINIO")+"/widget/calendario/"+token;
  const code='<iframe src="'+src+'" width="100%" height="760" style="border:0;border-radius:18px" loading="lazy" title="Disponibilidade Moriah"></iframe>';

  async function copy(){
    try{
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1800);
    }catch{}
  }

  return <div className="calendarEmbedCode">
    <div><small>URL DO WIDGET</small><code>{src}</code></div>
    <div><small>CÓDIGO PARA INCORPORAR</small><code>{code}</code></div>
    <button type="button" onClick={copy}>{copied?"Copiado ✓":"Copiar iframe"}</button>
  </div>;
}
