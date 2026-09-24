"use client";

import {useEffect,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {setPresence,type PresenceResult} from "../presenca/actions";

export default function AdminPresenceControl({
  initialOnDuty,
  initialOnDutySince,
  schemaReady
}:{
  initialOnDuty:boolean;
  initialOnDutySince:string|null;
  schemaReady:boolean;
}){
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [onDuty,setOnDuty]=useState(initialOnDuty);
  const [since,setSince]=useState(initialOnDutySince);
  const [feedback,setFeedback]=useState<PresenceResult|null>(null);

  useEffect(()=>{
    setOnDuty(initialOnDuty);
    setSince(initialOnDutySince);
  },[initialOnDuty,initialOnDutySince]);

  function toggle(){
    if(pending||!schemaReady)return;
    setFeedback(null);

    startTransition(async()=>{
      const result=await setPresence(onDuty?"END":"START");
      setFeedback(result);

      if(result.ok){
        setOnDuty(Boolean(result.onDuty));
        setSince(result.onDutySince||null);
        router.refresh();
      }
    });
  }

  const sinceLabel=since
    ?new Date(since).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})
    :null;

  if(!schemaReady){
    return <div className="adminPresenceBox adminPresenceUnavailable" aria-live="polite">
      <span>
        <b>Turno indisponível</b>
        <small> • migration de presença pendente neste ambiente</small>
      </span>
      <button type="button" disabled className="adminPresenceButton isOff">Migration pendente</button>
    </div>;
  }

  return <div className="adminPresenceBox">
    <span>
      {onDuty?"Em atendimento":"Fora de atendimento"}
      {onDuty&&sinceLabel?<small> desde {sinceLabel}</small>:null}
      {feedback&&<small className={feedback.ok?"adminPresenceFeedback ok":"adminPresenceFeedback error"}> • {feedback.message}</small>}
    </span>

    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-busy={pending}
      className={"adminPresenceButton "+(onDuty?"isOn":"isOff")}
    >
      {pending?"Salvando…":onDuty?"Encerrar turno":"Iniciar turno"}
    </button>
  </div>;
}
