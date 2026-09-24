"use client";

import {useEffect,useState} from "react";
import {Bot,Send,X,MessageCircle,ShieldCheck} from "lucide-react";

type Action={href:string;label:string};
type Msg={
  role:"user"|"assistant";
  content:string;
  booking?:Action|null;
  handoff?:Action|null;
};

export default function SupportChat(){
  const fallback={
    enabled:true,
    name:"Moriah Assistente",
    welcome:"Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?"
  };

  const [config,setConfig]=useState(fallback);
  const initial:Msg[]=[{role:"assistant",content:fallback.welcome}];
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [stayLinked,setStayLinked]=useState(false);
  const [messages,setMessages]=useState<Msg[]>(()=>{
    if(typeof window==="undefined")return initial;
    try{
      const value=sessionStorage.getItem("moriah-chat");
      return value?JSON.parse(value):initial;
    }catch{
      return initial;
    }
  });

  useEffect(()=>{
    fetch("/api/chat-config",{cache:"no-store"})
      .then(response=>response.ok?response.json():Promise.reject())
      .then(next=>{
        setConfig(next);
        setMessages(current=>current.length===1&&current[0].role==="assistant"
          ?[{...current[0],content:next.welcome||fallback.welcome}]
          :current
        );
      })
      .catch(()=>{});

    try{
      const params=new URLSearchParams(window.location.search);
      const token=params.get("booking");
      if(token){
        sessionStorage.setItem("moriah-stay-token",token);
        setStayLinked(true);
      }else{
        setStayLinked(Boolean(sessionStorage.getItem("moriah-stay-token")));
      }
    }catch{}
  },[]);

  function persist(next:Msg[]){
    setMessages(next);
    try{
      sessionStorage.setItem("moriah-chat",JSON.stringify(next.slice(-12)));
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

  async function send(event:React.FormEvent){
    event.preventDefault();
    const value=text.trim();
    if(!value||busy)return;

    metric("MESSAGE");
    const next=[...messages,{role:"user" as const,content:value}];
    persist(next);
    setText("");
    setBusy(true);

    let bookingToken="";
    try{
      bookingToken=sessionStorage.getItem("moriah-stay-token")||"";
    }catch{}

    try{
      const response=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:next,bookingToken})
      });
      const data=await response.json();

      setMessages(current=>{
        const updated=[
          ...current,
          {
            role:"assistant" as const,
            content:data.reply||data.error||"Atendimento indisponível no momento.",
            booking:data.booking||null,
            handoff:data.handoff||null
          }
        ];
        try{
          sessionStorage.setItem("moriah-chat",JSON.stringify(updated.slice(-12)));
        }catch{}
        return updated;
      });
    }catch{
      setMessages(current=>[
        ...current,
        {role:"assistant",content:"Não consegui conectar agora. Tente novamente em instantes."}
      ]);
    }finally{
      setBusy(false);
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
      aria-label="Abrir atendimento virtual"
    >
      {open?<X/>:<Bot/>}
      <span>Atendimento</span>
    </button>

    {open&&<section className="chatWindow">
      <header>
        <div>
          <b>{config.name}</b>
          <small>{stayLinked?"Hospedagem vinculada com segurança":"IA para dúvidas rápidas"}</small>
        </div>
        <button onClick={()=>setOpen(false)} aria-label="Fechar"><X size={18}/></button>
      </header>

      {stayLinked&&<div className="chatPrivateBadge">
        <ShieldCheck size={14}/>
        <span>Este dispositivo pode consultar saldo e pedidos da hospedagem ativa.</span>
      </div>}

      <div className="chatMessages">
        {messages.map((message,index)=><div key={index} className={"chatBubble "+message.role}>
          <p>{message.content}</p>
          {message.booking&&<a
            className="chatBookingCta"
            href={message.booking.href}
            onClick={()=>metric("BOOKING_CTA")}
          >{message.booking.label} →</a>}
          {message.handoff&&<a
            className="chatHumanCta"
            href={message.handoff.href}
            onClick={()=>metric("WHATSAPP")}
            target="_blank"
            rel="noreferrer"
          ><MessageCircle size={16}/>{message.handoff.label}</a>}
        </div>)}
        {busy&&<p className="assistant">Digitando…</p>}
      </div>

      <form onSubmit={send}>
        <input
          value={text}
          onChange={event=>setText(event.target.value)}
          maxLength={1500}
          placeholder={stayLinked?"Pergunte sobre sua conta, pedido ou estadia…":"Digite sua dúvida…"}
          aria-label="Mensagem"
        />
        <button disabled={busy||!text.trim()} aria-label="Enviar"><Send size={18}/></button>
      </form>

      <small className="chatDisclaimer">
        Dados financeiros só são consultados quando a hospedagem está vinculada por token válido.
      </small>
    </section>}
  </div>;
}
