"use client";

import type {CSSProperties,FormEvent} from "react";
import {useRef,useState} from "react";
import WheelCanvas,{WheelHandle,WheelSlice,WheelTheme} from "./wheel-canvas";
import styles from "./roleta.module.css";

type ReviewLink={key:string;label:string;url:string};
type Settings={title:string;subtitle:string;introText:string;reviewLinks:ReviewLink[];termsText:string};
type Prize=WheelSlice&{description:string|null};
type Theme={preset:string;primary:string;secondary:string;accent:string;surface:string;text:string;background:string;backgroundImage:string|null;animationStyle:string;event:{title:string;badge:string|null;slug:string;startsAt:string}|null};

const ambientClass=(animation:string)=>animation==="SNOW"?styles.ambientSnow:animation==="BUBBLES"?styles.ambientBubbles:animation==="SPARKLES"?styles.ambientSparkles:animation==="NONE"?styles.ambientNone:styles.ambientConfetti;

export default function RouletteGame({
  settingsId,
  variant,
  settings,
  initialPrizes,
  theme
}:{
  settingsId:"main"|"delivery";
  variant:"main"|"delivery";
  settings:Settings;
  initialPrizes:Prize[];
  theme:Theme;
}){
  const ref=useRef<WheelHandle>(null);
  const [step,setStep]=useState<"intro"|"identify"|"wheel"|"done">("intro");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [consent,setConsent]=useState(false);
  const [spinning,setSpinning]=useState(false);
  const [error,setError]=useState("");
  const [slices,setSlices]=useState<WheelSlice[]>(initialPrizes);
  const [result,setResult]=useState<{name:string;description:string|null;claimCode:string;expiresAt:string|null}|null>(null);

  const vars={
    "--roulette-primary":theme.primary,
    "--roulette-secondary":theme.secondary,
    "--roulette-accent":theme.accent,
    "--roulette-surface":theme.surface,
    "--roulette-text":theme.text,
    "--roulette-bg":theme.background,
    "--roulette-image":theme.backgroundImage?'url("'+theme.backgroundImage.replace(/"/g,"%22")+'")':"none"
  } as CSSProperties;
  const wheelTheme:WheelTheme={primary:theme.primary,secondary:theme.secondary,accent:theme.accent,surface:theme.surface};
  const delivery=variant==="delivery";

  function identify(event:FormEvent){
    event.preventDefault();
    setError("");
    if(name.trim().length<2)return setError("Informe seu nome.");
    if(phone.replace(/\D/g,"").length<10)return setError("Informe um telefone com DDD.");
    if(!consent)return setError("Aceite os termos para participar.");
    setStep("wheel");
  }

  async function spin(){
    if(spinning)return;
    setSpinning(true);
    setError("");
    try{
      const response=await fetch("/api/etc/roleta/play",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({name,phone,consent,settingsId})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível girar.");
      setSlices(data.wheel);
      await ref.current?.spinTo(data.prize.id,data.wheel);
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

  return <main className={styles.shell+" "+(delivery?styles.deliveryShell:"")} style={vars}>
    <div className={styles.backgroundImage}/>
    <div className={styles.backgroundGlow}/>
    <div className={styles.backgroundGrid}/>
    <div className={styles.ambient+" "+ambientClass(theme.animationStyle)}>
      {Array.from({length:26},(_,index)=><i key={index} style={{
        left:((index*37)%96+2)+"%",
        top:((index*53)%92+4)+"%",
        animationDelay:"-"+index*.31+"s",
        animationDuration:5+(index%5)+"s"
      }}/>)}
    </div>
    {step==="done"&&<div className={styles.winBurst}>{Array.from({length:38},(_,index)=><i key={index} style={{left:(index*29)%98+"%",animationDelay:(index%7)*.05+"s"}}/>)}</div>}

    <section className={styles.card+" "+(delivery?styles.deliveryCard:"")}>
      <header className={styles.header}>
        <div className={styles.headerGlow}/>
        <span>{delivery?"MORIAH FOOD • ROLETA ENTREGAS":"MORIAH • ROLETA 3.0"}</span>
        <h1>{settings.title}</h1>
        <p>{settings.subtitle}</p>
        {delivery&&<div className={styles.deliveryBadges}><span>iFood</span><span>99Food</span><span>Keeta</span></div>}
        {theme.event&&<a className={styles.eventRibbon} href={"/eventos/"+theme.event.slug}>
          <small>{theme.event.badge||"EVENTO ATIVO"}</small>
          <b>{theme.event.title}</b>
          <span>{new Date(theme.event.startsAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"long"})} ↗</span>
        </a>}
      </header>

      {step==="intro"&&<div className={styles.intro}>
        <div className={styles.stepBadge}>01 • EXPERIÊNCIA</div>
        <h2>{delivery?"Seu pedido chegou. Que tal tentar a sorte?":"Quer contar como foi sua experiência?"}</h2>
        <p>{settings.introText}</p>
        {settings.reviewLinks.length>0&&<div className={styles.reviewGrid}>
          {settings.reviewLinks.map(link=><a key={link.key} className={styles.reviewButton} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
        </div>}
        <button className={styles.primary} onClick={()=>setStep("identify")}>Continuar para a roleta</button>
        <small>A avaliação é opcional e não altera sua chance nem o prêmio.</small>
      </div>}

      {step==="identify"&&<form className={styles.form} onSubmit={identify}>
        <div className={styles.stepBadge}>02 • IDENTIFICAÇÃO</div>
        <h2>Quem vai tentar a sorte?</h2>
        <label>Nome<input value={name} onChange={event=>setName(event.target.value)} required/></label>
        <label>Telefone / WhatsApp<input value={phone} onChange={event=>setPhone(event.target.value)} inputMode="tel" required/></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{settings.termsText}</span></label>
        {error&&<p className={styles.error}>{error}</p>}
        <button className={styles.primary}>Liberar minha roleta</button>
      </form>}

      {(step==="wheel"||step==="done")&&<div className={styles.game}>
        <div className={styles.stepBadge}>{step==="done"?"04 • RESULTADO":"03 • ROLETA"}</div>
        <div className={styles.wheelStage}><div className={styles.wheelHalo}/><WheelCanvas ref={ref} slices={slices} theme={wheelTheme}/></div>
        {step==="wheel"&&<>
          {error&&<p className={styles.error}>{error}</p>}
          <button className={styles.spinButton} onClick={spin} disabled={spinning||!slices.length}><span>{spinning?"Girando…":"GIRAR A ROLETA"}</span><i/></button>
          <small>Resultado definido no servidor e registrado para auditoria.</small>
        </>}
        {step==="done"&&result&&<div className={styles.result}>
          <span>VOCÊ GANHOU</span>
          <h2>{result.name}</h2>
          {result.description&&<p>{result.description}</p>}
          <div className={styles.claim}><small>CÓDIGO PARA RETIRADA</small><strong>{result.claimCode}</strong></div>
          {result.expiresAt&&<small>Válido até {new Date(result.expiresAt).toLocaleDateString("pt-BR")}.</small>}
          <p>{delivery?"Informe o código no próximo atendimento elegível da Moriah Food.":"Apresente este código à equipe da Moriah."}</p>
        </div>}
      </div>}
    </section>
  </main>;
}
