"use client";

import {CheckCircle2,LoaderCircle,XCircle} from "lucide-react";
import {useEffect,useRef,useState} from "react";

type Feedback={kind:"pending"|"success"|"error";message:string};

export default function AdminActionFeedback(){
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const timer=useRef<number|null>(null);

  useEffect(()=>{
    const clear=()=>{if(timer.current)window.clearTimeout(timer.current);timer.current=null;};
    const onSubmit=(event:Event)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      if(!form||form.method.toLowerCase()==="get")return;
      clear();
      const pending=form.dataset.feedbackPending||"Processando alteração…";
      const success=form.dataset.feedbackSuccess||"Ação concluída com sucesso.";
      setFeedback({kind:"pending",message:pending});
      timer.current=window.setTimeout(()=>{
        setFeedback({kind:"success",message:success});
        timer.current=window.setTimeout(()=>setFeedback(null),3200);
      },1100);
    };
    const onError=()=>{
      clear();
      setFeedback({kind:"error",message:"Não foi possível concluir a ação. Revise os dados e tente novamente."});
      timer.current=window.setTimeout(()=>setFeedback(null),5000);
    };
    document.addEventListener("submit",onSubmit,true);
    window.addEventListener("error",onError);
    window.addEventListener("unhandledrejection",onError);
    return ()=>{
      clear();
      document.removeEventListener("submit",onSubmit,true);
      window.removeEventListener("error",onError);
      window.removeEventListener("unhandledrejection",onError);
    };
  },[]);

  if(!feedback)return null;
  return <div className={"adminActionToast "+feedback.kind} role="status" aria-live="polite">
    <span>{feedback.kind==="pending"?<LoaderCircle className="spin" size={19}/>:feedback.kind==="success"?<CheckCircle2 size={19}/>:<XCircle size={19}/>}</span>
    <div><small>{feedback.kind==="pending"?"AGUARDE":feedback.kind==="success"?"CONCLUÍDO":"ATENÇÃO"}</small><b>{feedback.message}</b></div>
    {feedback.kind!=="pending"&&<button type="button" onClick={()=>setFeedback(null)} aria-label="Fechar">×</button>}
  </div>;
}
