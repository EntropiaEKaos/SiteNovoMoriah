"use client";

import {useEffect,useRef,useState} from "react";
import {
  Bot,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

type Action={href:string;label:string};
type Msg={
  role:"user"|"assistant";
  content:string;
  booking?:Action|null;
  handoff?:Action|null;
  actions?:Array<Action&{external?:boolean}>|null;
};

const fallback={
  enabled:true,
  name:"Moriah Assistente",
  welcome:"Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?"
};

export default function SupportChat({locale}:{locale:"pt"|"en"|"es"}){
  const copy=locale==="en"?{
    online:"ONLINE",service:"Support",privateTitle:"Stay linked",privateBody:"This device can check balance and orders for the active stay.",you:"You",suggestions:["What stays do you offer?","I want to check availability","I want to see Moriah Food"],typing:"Assistant is typing",placeholderPrivate:"Ask about balance, order or stay…",placeholder:"Write your message…",disclaimer:"Moriah AI • private data only appears with a linked stay.",connectError:"I couldn’t connect right now. Please try again shortly."
  }:locale==="es"?{
    online:"EN LÍNEA",service:"Atención",privateTitle:"Hospedaje vinculado",privateBody:"Este dispositivo puede consultar saldo y pedidos de la estancia activa.",you:"Tú",suggestions:["¿Qué hospedajes tienen?","Quiero consultar disponibilidad","Quiero conocer Moriah Food"],typing:"El asistente está escribiendo",placeholderPrivate:"Pregunta por saldo, pedido o estancia…",placeholder:"Escribe tu mensaje…",disclaimer:"IA de Moriah • los datos privados solo aparecen con hospedaje vinculado.",connectError:"No pude conectar ahora. Inténtalo nuevamente en unos instantes."
  }:{
    online:"ONLINE",service:"Atendimento",privateTitle:"Hospedagem vinculada",privateBody:"Este dispositivo pode consultar saldo e pedidos da estadia ativa.",you:"Você",suggestions:["Quais hospedagens vocês têm?","Quero consultar disponibilidade","Quero conhecer o Moriah Food"],typing:"Assistente digitando",placeholderPrivate:"Pergunte sobre saldo, pedido ou estadia…",placeholder:"Escreva sua mensagem…",disclaimer:"{copy.disclaimer}",connectError:"Não consegui conectar agora. Tente novamente em instantes."
  };
  const initial:Msg[]=[{role:"assistant",content:fallback.welcome}];

  const [config,setConfig]=useState(fallback);
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [stayLinked,setStayLinked]=useState(false);
  const [messages,setMessages]=useState<Msg[]>(initial);

  const endRef=useRef<HTMLDivElement|null>(null);
  const composerRef=useRef<HTMLTextAreaElement|null>(null);

  function scrollToBottom(behavior:ScrollBehavior="smooth"){
    if(typeof window==="undefined")return;
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.requestAnimationFrame(()=>{
      endRef.current?.scrollIntoView({
        block:"end",
        behavior:reduced?"auto":behavior
      });
    });
  }

  useEffect(()=>{
    try{
      const stored=sessionStorage.getItem("moriah-chat");
      if(stored){
        const parsed=JSON.parse(stored);
        if(Array.isArray(parsed)&&parsed.length){
          setMessages(parsed);
        }
      }

      const params=new URLSearchParams(window.location.search);
      const token=params.get("booking");
      if(token){
        sessionStorage.setItem("moriah-stay-token",token);
        setStayLinked(true);
      }else{
        setStayLinked(Boolean(sessionStorage.getItem("moriah-stay-token")));
      }
    }catch{}

    fetch("/api/chat-config",{cache:"no-store"})
      .then(response=>response.ok?response.json():Promise.reject())
      .then(next=>{
        setConfig(next);
        setMessages(current=>current.length===1&&current[0].role==="assistant"&&current[0].content===fallback.welcome
          ?[{...current[0],content:next.welcome||fallback.welcome}]
          :current
        );
      })
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!open)return;
    scrollToBottom(messages.length<=1?"auto":"smooth");
  },[open,messages,busy,stayLinked]);

  useEffect(()=>{
    if(!open)return;
    const timer=window.setTimeout(()=>composerRef.current?.focus(),140);
    return ()=>window.clearTimeout(timer);
  },[open]);

  function persist(next:Msg[]){
    const limited=next.slice(-20);
    setMessages(limited);
    try{
      sessionStorage.setItem("moriah-chat",JSON.stringify(limited));
    }catch{}
  }

  function metric(kind:string){
    fetch("/api/chat-metric",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({kind}),
      keepalive:true
    }).catch(()=>{});
  }

  function resetConversation(){
    const next=[{role:"assistant" as const,content:config.welcome||fallback.welcome}];
    persist(next);
    setText("");
    setBusy(false);
    window.setTimeout(()=>{
      composerRef.current?.focus();
      scrollToBottom("auto");
    },0);
  }

  function choosePrompt(prompt:string){
    setText(prompt);
    window.setTimeout(()=>composerRef.current?.focus(),0);
  }

  function resizeComposer(target:HTMLTextAreaElement){
    target.style.height="auto";
    target.style.height=Math.min(target.scrollHeight,112)+"px";
  }

  async function send(event:React.FormEvent){
    event.preventDefault();
    const value=text.trim();
    if(!value||busy)return;

    metric("MESSAGE");
    const next=[...messages,{role:"user" as const,content:value}];
    persist(next);
    setText("");
    setBusy(true);

    if(composerRef.current){
      composerRef.current.style.height="auto";
    }

    let bookingToken="";
    try{
      bookingToken=sessionStorage.getItem("moriah-stay-token")||"";
    }catch{}

    try{
      const response=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:next,bookingToken,locale})
      });
      const data=await response.json();

      setMessages(current=>{
        const updated=[
          ...current,
          {
            role:"assistant" as const,
            content:data.reply||data.error||"Atendimento indisponível no momento.",
            booking:data.booking||null,
            handoff:data.handoff||null,
            actions:Array.isArray(data.actions)?data.actions.slice(0,4):null
          }
        ].slice(-20);
        try{
          sessionStorage.setItem("moriah-chat",JSON.stringify(updated));
        }catch{}
        return updated;
      });
    }catch{
      setMessages(current=>{
        const updated=[
          ...current,
          {role:"assistant" as const,content:copy.connectError}
        ].slice(-20);
        try{
          sessionStorage.setItem("moriah-chat",JSON.stringify(updated));
        }catch{}
        return updated;
      });
    }finally{
      setBusy(false);
      window.setTimeout(()=>composerRef.current?.focus(),0);
    }
  }

  if(!config.enabled)return null;

  return <div className="supportChat">
    <button
      className="chatLauncher"
      onClick={()=>setOpen(value=>{
        if(!value)metric("OPEN");
        return !value;
      })}
      aria-label={open?"Fechar atendimento virtual":"Abrir atendimento virtual"}
      aria-expanded={open}
    >
      <span className="chatLauncherIcon">{open?<X size={19}/>:<Bot size={19}/>}</span>
      <span className="chatLauncherCopy">
        <small>{copy.online}</small>
        <b>{copy.service}</b>
      </span>
    </button>

    {open&&<section className="chatWindow" aria-label="Atendimento virtual Moriah">
      <header className="chatHeader">
        <div className="chatHeaderIdentity">
          <span className="chatHeaderAvatar"><Sparkles size={19}/></span>
          <div>
            <b>{config.name}</b>
            <small><i/> Online agora • respostas rápidas</small>
          </div>
        </div>

        <div className="chatHeaderActions">
          <button
            type="button"
            onClick={resetConversation}
            aria-label="Nova conversa"
            title="Nova conversa"
          ><RotateCcw size={16}/></button>
          <button
            type="button"
            onClick={()=>setOpen(false)}
            aria-label="Fechar"
            title="Fechar"
          ><X size={18}/></button>
        </div>
      </header>

      {stayLinked&&<div className="chatPrivateBadge">
        <ShieldCheck size={15}/>
        <span>
          <b>{copy.privateTitle}</b>
          {copy.privateBody}
        </span>
      </div>}

      <div className="chatMessages" aria-live="polite" aria-busy={busy}>
        {messages.map((message,index)=><div
          key={index}
          className={"chatMessageRow "+message.role}
        >
          {message.role==="assistant"&&<span className="chatMessageAvatar"><Bot size={14}/></span>}

          <div className={"chatBubble "+message.role}>
            <small className="chatBubbleMeta">{message.role==="assistant"?"Moriah":copy.you}</small>
            <p>{message.content}</p>

            {message.booking&&!message.actions?.some(action=>action.href===message.booking?.href)&&<a
              className="chatBookingCta"
              href={message.booking.href}
              onClick={()=>metric("BOOKING_CTA")}
            >{message.booking.label} →</a>}

            {message.actions&&message.actions.length>0&&<div className="chatActionGrid">
              {message.actions.map(action=><a
                key={action.href}
                className="chatBookingCta"
                href={action.href}
                target={action.external?"_blank":undefined}
                rel={action.external?"noreferrer":undefined}
                onClick={()=>metric(action.external?"WHATSAPP":"ACTION_CTA")}
              >{action.label} →</a>)}
            </div>}

            {!message.actions?.some(action=>action.href===message.handoff?.href)&&message.handoff&&<a
              className="chatHumanCta"
              href={message.handoff.href}
              onClick={()=>metric("WHATSAPP")}
              target="_blank"
              rel="noreferrer"
            ><MessageCircle size={16}/>{message.handoff.label}</a>}
          </div>
        </div>)}

        {messages.length<=1&&!busy&&<div className="chatQuickPrompts" aria-label="Sugestões">
          {copy.suggestions.map(prompt=><button
            type="button"
            key={prompt}
            onClick={()=>choosePrompt(prompt)}
          >{prompt}</button>)}
        </div>}

        {busy&&<div className="chatTyping" aria-label={copy.typing}>
          <span className="chatMessageAvatar"><Bot size={14}/></span>
          <div><i/><i/><i/></div>
        </div>}

        <div ref={endRef} className="chatScrollAnchor" aria-hidden="true"/>
      </div>

      <form onSubmit={send} className="chatComposer">
        <textarea
          ref={composerRef}
          value={text}
          onChange={event=>{
            setText(event.target.value);
            resizeComposer(event.currentTarget);
          }}
          onKeyDown={event=>{
            if(event.key==="Enter"&&!event.shiftKey){
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          maxLength={1500}
          placeholder={stayLinked?copy.placeholderPrivate:copy.placeholder}
          aria-label="Mensagem"
        />
        <button disabled={busy||!text.trim()} aria-label="Enviar">
          <Send size={18}/>
        </button>
      </form>

      <small className="chatDisclaimer">
        <ShieldCheck size={12}/>
        IA da Moriah • dados privados só aparecem com hospedagem vinculada.
      </small>
    </section>}
  </div>;
}
