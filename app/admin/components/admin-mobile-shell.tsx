"use client";

import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {Menu,X} from "lucide-react";

export default function AdminMobileShell({
  sidebar,children
}:{sidebar:React.ReactNode;children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  const pathname=usePathname();

  useEffect(()=>{setOpen(false);},[pathname]);
  useEffect(()=>{
    if(!open)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[open]);

  return <div className={"adminApp adminRevamp"+(open?" adminMenuOpen":"")}>
    <button
      type="button"
      className="adminMobileMenuButton"
      aria-label={open?"Fechar menu administrativo":"Abrir menu administrativo"}
      aria-expanded={open}
      aria-controls="adminRevampSidebar"
      onClick={()=>setOpen(value=>!value)}
    >{open?<X size={21}/>:<Menu size={21}/>}<span>Menu</span></button>
    {open&&<button type="button" className="adminMobileBackdrop" aria-label="Fechar menu" onClick={()=>setOpen(false)}/>}
    <div id="adminRevampSidebar" className="adminRevampSidebarSlot">{sidebar}</div>
    {children}
  </div>;
}
