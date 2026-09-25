"use client";

import {FormEvent,useRef,useState} from "react";
import WheelCanvas,{WheelHandle,WheelSlice} from "./wheel-canvas";
import styles from "./roleta.module.css";

type Settings={
  title:string;
  subtitle:string;
  introText:string;
  googleReviewUrl:string|null;
  googleReviewLabel:string;
  termsText:string;
};
type Prize=WheelSlice&{description:string|null};

export default function RouletteGame({settings,initialPrizes}:{settings:Settings;initialPrizes:Prize[]}){
  const wheelRef=useRef<WheelHandle>(null);
  const [step,setStep]=useState<"intro"|"identify"|"wheel"|"done">("intro");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [consent,setConsent]=useState(false);
  const [spinning,setSpinning]=useState(false);
  const [error,setError]=useState("");
  const [slices,setSlices]=useState<WheelSlice[]>(initialPrizes);
  const [result,setResult]=useState<{name:string;description:string|null;claimCode:string;expiresAt:string|null}|null>(null);

  function identify(event:FormEvent){
    event.preventDefault();
    setError("");
    if(name.trim().length<2){setError("Informe seu nome.");return;}
    if(phone.replace(/\D/g,"").length<10){setError("Informe um telefone com DDD.");return;}
    if(!consent){setError("Aceite os termos para participar.");return;}
    setStep("wheel");
  }

  async function spin(){
    if(spinning)return;
    setSpinning(true);
    setError("");
    try{
      const response=await fetch("/api/et/roleta/play",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({name,phone,consent})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível girar.");
      setSlices(data.wheel);
      await wheelRef.current?.spinTo(data.prize.id,data.wheel);
      setResult({
        name:data.prize.name,
        description:data.prize.description||null,
        claimCode:data.claimCode,
        expiresAt:data.expiresAt
      });
      setStep("done");
    }catch(err){
      setError(err instanceof Error?err.message:"Não foi possível girar.");
    }finally{
      setSpinning(false);
    }
  }

  return <main className={styles.shell}>
    <section className={styles.card}>
      <header className={styles.header}>
        <span>MORIAH • EXPERIÊNCIA</span>
        <h1>{settings.title}</h1>
        <p>{settings.subtitle}</p>
      </header>

      {step==="intro"&&<div className={styles.intro}>
        <div className={styles.stepBadge}>01 • EXPERIÊNCIA</div>
        <h2>Quer contar como foi sua experiência?</h2>
        <p>{settings.introText}</p>
        {settings.googleReviewUrl&&<a className={styles.googleButton} href={settings.googleReviewUrl} target="_blank" rel="noreferrer">
          {settings.googleReviewLabel} ↗
        </a>}
        <button className={styles.primary} onClick={()=>setStep("identify")}>Continuar para a roleta</button>
        <small>A avaliação é opcional e não altera sua chance nem o prêmio.</small>
      </div>}

      {step==="identify"&&<form className={styles.form} onSubmit={identify}>
        <div className={styles.stepBadge}>02 • IDENTIFICAÇÃO</div>
        <h2>Quem vai tentar a sorte?</h2>
        <label>Nome<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} autoComplete="name" required/></label>
        <label>Telefone / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24} inputMode="tel" autoComplete="tel" required/></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{settings.termsText}</span></label>
        {error&&<p className={styles.error}>{error}</p>}
        <button className={styles.primary}>Liberar minha roleta</button>
        <small>Uma participação por telefone nesta campanha.</small>
      </form>}

      {(step==="wheel"||step==="done")&&<div className={styles.game}>
        <div className={styles.stepBadge}>{step==="done"?"04 • RESULTADO":"03 • ROLETA"}</div>
        <WheelCanvas ref={wheelRef} slices={slices}/>
        {step==="wheel"&&<>
          {error&&<p className={styles.error}>{error}</p>}
          <button className={styles.spinButton} onClick={spin} disabled={spinning||!slices.length}>
            {spinning?"Girando…":"GIRAR A ROLETA"}
          </button>
          <small>O resultado é definido no servidor e registrado para auditoria.</small>
        </>}
        {step==="done"&&result&&<div className={styles.result}>
          <span>VOCÊ GANHOU</span>
          <h2>{result.name}</h2>
          {result.description&&<p>{result.description}</p>}
          <div className={styles.claim}><small>CÓDIGO PARA RETIRADA</small><strong>{result.claimCode}</strong></div>
          {result.expiresAt&&<small>Válido até {new Date(result.expiresAt).toLocaleDateString("pt-BR")}.</small>}
          <p>Apresente este código à equipe da Moriah. A entrega ficará registrada no painel.</p>
        </div>}
      </div>}
    </section>
  </main>;
}
