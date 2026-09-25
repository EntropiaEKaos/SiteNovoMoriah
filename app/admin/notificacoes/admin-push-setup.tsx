"use client";

import {useState} from "react";
import {getToken,getMessaging,isSupported} from "firebase/messaging";
import {getFirebaseApp,getFirebaseVapidKey} from "../../../lib/firebase";

export default function AdminPushSetup(){
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<string>(
    typeof Notification!=="undefined"&&Notification.permission==="granted"
      ?"Permissão concedida neste navegador."
      :"Notificações ainda não ativadas neste dispositivo."
  );

  async function enable(){
    if(busy)return;
    setBusy(true);
    try{
      if(!("serviceWorker" in navigator)||!("Notification" in window)){
        throw new Error("Este navegador não oferece suporte a notificações PWA.");
      }
      if(!(await isSupported())){
        throw new Error("Firebase Messaging não é suportado neste navegador.");
      }

      const permission=await Notification.requestPermission();
      if(permission!=="granted")throw new Error("Permissão de notificações não concedida.");

      const [app,vapidKey]=await Promise.all([getFirebaseApp(),getFirebaseVapidKey()]);
      if(!app||!vapidKey)throw new Error("Firebase Web Push ainda não está configurado no painel.");

      const registration=await navigator.serviceWorker.register("/admin-sw.js",{scope:"/admin/"});
      await navigator.serviceWorker.ready;

      const messaging=getMessaging(app);
      const token=await getToken(messaging,{
        vapidKey,
        serviceWorkerRegistration:registration
      });
      if(!token)throw new Error("O navegador não retornou um token de push.");

      const response=await fetch("/api/admin/push/register",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          token,
          deviceName:navigator.userAgentData?.platform||navigator.platform||"Dispositivo Admin",
          platform:navigator.userAgentData?.platform||navigator.platform||null
        })
      });
      if(!response.ok)throw new Error("Não foi possível registrar este dispositivo no Admin.");

      setStatus("Notificações ativadas e dispositivo registrado.");
      window.location.reload();
    }catch(error){
      setStatus(error instanceof Error?error.message:"Falha ao ativar notificações.");
    }finally{
      setBusy(false);
    }
  }

  return <div className="adminPushSetup">
    <div>
      <small>PWA ADMIN / PUSH</small>
      <strong>Este dispositivo</strong>
      <p>{status}</p>
    </div>
    <button type="button" onClick={enable} disabled={busy}>
      {busy?"Ativando…":"Ativar notificações"}
    </button>
  </div>;
}
