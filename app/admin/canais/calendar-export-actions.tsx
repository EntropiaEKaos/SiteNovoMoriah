"use client";

import {useState} from "react";

export default function CalendarExportActions({path}:{path:string}){
  const [copied,setCopied]=useState(false);

  async function copy(){
    const url=new URL(path,window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1800);
  }

  return <div className="adminPageNote" style={{marginTop:14}}>
    <strong>Calendário Moriah → canal</strong>
    <p style={{margin:"6px 0 10px"}}>
      Importe este calendário no Airbnb, Booking.com ou outro canal para bloquear lá reservas confirmadas e bloqueios manuais do Moriah.
    </p>
    <div className="adminInlineActions">
      <button type="button" className="highlight" onClick={copy}>
        {copied?"Link copiado ✓":"Copiar calendário Moriah"}
      </button>
      <a className="adminSecondaryAction" href={path} target="_blank" rel="noreferrer">Abrir .ICS ↗</a>
    </div>
  </div>;
}
