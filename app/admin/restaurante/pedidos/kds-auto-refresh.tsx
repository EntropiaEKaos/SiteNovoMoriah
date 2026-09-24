"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

export default function KdsAutoRefresh({
  orderIds,
  soundEnabled,
  pendingNotifications
}:{
  orderIds:string[];
  soundEnabled:boolean;
  pendingNotifications:number;
}){
  const router=useRouter();
  const previous=useRef(new Set(orderIds));
  const audio=useRef<AudioContext|null>(null);
  const [soundArmed,setSoundArmed]=useState(false);
  const [desktopArmed,setDesktopArmed]=useState(
    typeof window!=="undefined"&&"Notification" in window&&Notification.permission==="granted"
  );

  useEffect(()=>{
    const timer=window.setInterval(()=>router.refresh(),10000);
    return()=>window.clearInterval(timer);
  },[router]);

  useEffect(()=>{
    const incomingIds=orderIds.filter(id=>!previous.current.has(id));

    if(incomingIds.length){
      if(soundEnabled&&soundArmed&&audio.current){
        try{
          const ctx=audio.current;
          [880,1040].forEach((frequency,index)=>{
            const oscillator=ctx.createOscillator();
            const gain=ctx.createGain();
            oscillator.frequency.value=frequency;
            gain.gain.setValueAtTime(.09,ctx.currentTime+index*.16);
            gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.14+index*.16);
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(ctx.currentTime+index*.16);
            oscillator.stop(ctx.currentTime+.15+index*.16);
          });
        }catch{}
      }

      if(desktopArmed&&"Notification" in window&&Notification.permission==="granted"){
        try{
          const notification=new Notification(
            incomingIds.length===1?"Novo pedido Moriah Food":"Novos pedidos Moriah Food",
            {
              body:incomingIds.length===1
                ?"Um novo pedido entrou na fila da cozinha."
                :incomingIds.length+" novos pedidos entraram na fila.",
              tag:"moriah-kitchen-orders"
            }
          );
          notification.onclick=()=>{
            window.focus();
            notification.close();
          };
        }catch{}
      }

      document.title="("+incomingIds.length+") NOVO • Moriah Food KDS";
      const reset=window.setTimeout(()=>{document.title="Moriah Food KDS";},12000);
      previous.current=new Set(orderIds);
      return()=>window.clearTimeout(reset);
    }

    previous.current=new Set(orderIds);
  },[orderIds,soundEnabled,soundArmed,desktopArmed]);

  function armSound(){
    if(!soundEnabled)return;
    if(!audio.current){
      const AudioCtx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(AudioCtx)audio.current=new AudioCtx();
    }
    if(audio.current?.state==="suspended")void audio.current.resume();
    setSoundArmed(value=>!value);
  }

  async function armDesktop(){
    if(!("Notification" in window))return;
    try{
      const permission=await Notification.requestPermission();
      setDesktopArmed(permission==="granted");
    }catch{}
  }

  return <div className="kdsLiveBar">
    <span><i/> Atualização automática a cada 10s • {pendingNotifications} aviso(s) novo(s)</span>
    <div className="kdsLiveActions">
      {soundEnabled&&<button type="button" onClick={armSound}>
        {soundArmed?"Som ativo":"Ativar som"}
      </button>}
      {"Notification" in globalThis&&<button type="button" onClick={armDesktop}>
        {desktopArmed?"Notificação ativa":"Ativar notificação"}
      </button>}
    </div>
  </div>;
}
