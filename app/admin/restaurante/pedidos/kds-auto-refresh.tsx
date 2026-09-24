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
  const [desktopSupported,setDesktopSupported]=useState(false);
  const [desktopArmed,setDesktopArmed]=useState(false);
  const [online,setOnline]=useState(true);
  const [lastSync,setLastSync]=useState<Date|null>(null);

  useEffect(()=>{
    const supported="Notification" in window;
    setDesktopSupported(supported);
    if(supported)setDesktopArmed(Notification.permission==="granted");
    setOnline(navigator.onLine);
    setLastSync(new Date());

    const onOnline=()=>{setOnline(true);setLastSync(new Date());router.refresh();};
    const onOffline=()=>setOnline(false);
    window.addEventListener("online",onOnline);
    window.addEventListener("offline",onOffline);

    try{
      localStorage.setItem("moriah-kds-last-orders",JSON.stringify({
        at:new Date().toISOString(),
        orderIds
      }));
    }catch{}

    return()=>{
      window.removeEventListener("online",onOnline);
      window.removeEventListener("offline",onOffline);
    };
  },[router]);

  useEffect(()=>{
    setLastSync(new Date());
    try{
      localStorage.setItem("moriah-kds-last-orders",JSON.stringify({
        at:new Date().toISOString(),
        orderIds
      }));
    }catch{}
  },[orderIds]);

  useEffect(()=>{
    const timer=window.setInterval(()=>{
      if(navigator.onLine)router.refresh();
    },8000);
    return()=>window.clearInterval(timer);
  },[router]);

  useEffect(()=>{
    const incomingIds=orderIds.filter(id=>!previous.current.has(id));

    if(incomingIds.length){
      if(soundEnabled&&soundArmed&&audio.current){
        try{
          const ctx=audio.current;
          [880,1040,1180].forEach((frequency,index)=>{
            const oscillator=ctx.createOscillator();
            const gain=ctx.createGain();
            oscillator.frequency.value=frequency;
            gain.gain.setValueAtTime(.08,ctx.currentTime+index*.13);
            gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.11+index*.13);
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(ctx.currentTime+index*.13);
            oscillator.stop(ctx.currentTime+.12+index*.13);
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

      document.title="("+incomingIds.length+") NOVO • Moriah Kitchen";
      const reset=window.setTimeout(()=>{document.title="Moriah Kitchen";},12000);
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

  async function fullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch{}
  }

  return <div className={"kdsLiveBar"+(online?"":" isOffline")}>
    <span>
      <i/>
      {online?"Online • sincronização a cada 8s":"OFFLINE • mantendo a fila atual"}
      {lastSync&&<small> • última leitura {lastSync.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</small>}
      <small> • {pendingNotifications} aviso(s)</small>
    </span>
    <div className="kdsLiveActions">
      <button type="button" onClick={fullscreen}>Tela cheia</button>
      {soundEnabled&&<button type="button" onClick={armSound}>
        {soundArmed?"Som ativo":"Ativar som"}
      </button>}
      {desktopSupported&&<button type="button" onClick={armDesktop}>
        {desktopArmed?"Notificação ativa":"Ativar notificação"}
      </button>}
    </div>
  </div>;
}
