"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

export default function PwaRegister(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname.startsWith("/admin")||!("serviceWorker" in navigator))return;
    navigator.serviceWorker.getRegistrations().then(registrations=>{
      for(const registration of registrations){
        const script=registration.active?.scriptURL||registration.waiting?.scriptURL||registration.installing?.scriptURL||"";
        if(script.endsWith("/sw.js"))registration.unregister().catch(()=>{});
      }
    }).catch(()=>{});
  },[pathname]);

  return null;
}
