"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

export default function KdsAutoRefresh({
  orderIds,
  soundEnabled
}:{
  orderIds:string[];
  soundEnabled:boolean;
}){
  const router=useRouter();
  const previous=useRef(new Set(orderIds));
  const audio=useRef<AudioContext|null>(null);
  const [soundArmed,setSoundArmed]=useState(false);

  useEffect(()=>{
    const timer=window.setInterval(()=>router.refresh(),15000);
    return()=>window.clearInterval(timer);
  },[router]);

  useEffect(()=>{
    const incoming=orderIds.some(id=>!previous.current.has(id));
    if(incoming&&soundEnabled&&soundArmed&&audio.current){
      try{
        const ctx=audio.current;
        const oscillator=ctx.createOscillator();
        const gain=ctx.createGain();
        oscillator.frequency.value=880;
        gain.gain.setValueAtTime(.08,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.28);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime+.3);
      }catch{}
    }
    previous.current=new Set(orderIds);
  },[orderIds,soundEnabled,soundArmed]);

  function armSound(){
    if(!soundEnabled)return;
    if(!audio.current){
      const AudioCtx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(AudioCtx)audio.current=new AudioCtx();
    }
    if(audio.current?.state==="suspended")void audio.current.resume();
    setSoundArmed(value=>!value);
  }

  return <div className="kdsLiveBar">
    <span><i/> Atualização automática a cada 15s</span>
    {soundEnabled&&<button type="button" onClick={armSound}>
      {soundArmed?"Som ativo":"Ativar alerta sonoro"}
    </button>}
  </div>;
}
