"use client";

import {CheckCircle2,LoaderCircle,XCircle} from "lucide-react";
import {useEffect,useRef,useState} from "react";

type Feedback={kind:"pending"|"success"|"error";message:string};

export default function AdminActionFeedback(){
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const timer=useRef<number|null>(null);
  const pendingSuccess=useRef("Ação concluída com sucesso.");

  useEffect(()=>{
    const clear=()=>{
      if(timer.current)window.clearTimeout(timer.current);
      timer.current=null;
    };
    const dismissLater=(ms:number)=>{
      clear();
      timer.current=window.setTimeout(()=>setFeedback(null),ms);
    };

    const onSubmit=(event:Event)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      if(!form||form.method.toLowerCase()==="get")return;
      clear();
      pendingSuccess.current=form.dataset.feedbackSuccess||"Ação concluída com sucesso.";
      setFeedback({
        kind:"pending",
        message:form.dataset.feedbackPending||"Processando alteração…"
      });
    };

    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
      const headers=new Headers(init?.headers||((input instanceof Request)?input.headers:undefined));
      const isServerAction=headers.has("Next-Action")||headers.has("next-action");
      try{
        const response=await originalFetch(input,init);
        if(isServerAction){
          if(response.ok){
            setFeedback({kind:"success",message:pendingSuccess.current});
            dismissLater(3200);
          }else{
            setFeedback({
              kind:"error",
              message:"Não foi possível concluir a ação. Revise os dados e tente novamente."
            });
            dismissLater(5200);
          }
        }
        return response;
      }catch(error){
        if(isServerAction){
          setFeedback({
            kind:"error",
            message:"Falha de comunicação ao executar a ação. Tente novamente."
          });
          dismissLater(5200);
        }
        throw error;
      }
    };

    const onError=()=>{
      clear();
      setFeedback({
        kind:"error",
        message:"Não foi possível concluir a ação. Revise os dados e tente novamente."
      });
      dismissLater(5200);
    };

    document.addEventListener("submit",onSubmit,true);
    window.addEventListener("error",onError);
    window.addEventListener("unhandledrejection",onError);

    return ()=>{
      clear();
      window.fetch=originalFetch;
      document.removeEventListener("submit",onSubmit,true);
      window.removeEventListener("error",onError);
      window.removeEventListener("unhandledrejection",onError);
    };
  },[]);

  if(!feedback)return null;
  return <div className={"adminActionToast "+feedback.kind} role="status" aria-live="polite">
    <span>{feedback.kind==="pending"
      ?<LoaderCircle className="spin" size={19}/>
      :feedback.kind==="success"
        ?<CheckCircle2 size={19}/>
        :<XCircle size={19}/>}
    </span>
    <div>
      <small>{feedback.kind==="pending"?"AGUARDE":feedback.kind==="success"?"CONCLUÍDO":"ATENÇÃO"}</small>
      <b>{feedback.message}</b>
    </div>
    {feedback.kind!=="pending"&&<button type="button" onClick={()=>setFeedback(null)} aria-label="Fechar">×</button>}
  </div>;
}
