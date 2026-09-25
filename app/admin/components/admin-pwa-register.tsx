"use client";

import {useEffect,useState} from "react";

export default function AdminPwaRegister(){
  const [offline,setOffline]=useState(false);

  useEffect(()=>{
    if(!("serviceWorker" in navigator))return;

    navigator.serviceWorker.register("/admin-sw.js",{scope:"/admin/"})
      .catch(error=>console.error("ADMIN_SW_REGISTER_FAILED",error));

    const online=()=>setOffline(false);
    const offlineHandler=()=>setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online",online);
    window.addEventListener("offline",offlineHandler);
    return ()=>{
      window.removeEventListener("online",online);
      window.removeEventListener("offline",offlineHandler);
    };
  },[]);

  return offline
    ?<div className="adminOfflineBanner" role="status">Sem conexão • dados administrativos não são armazenados offline</div>
    :null;
}
