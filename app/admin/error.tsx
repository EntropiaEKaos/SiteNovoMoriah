"use client";

import {useEffect} from "react";

export default function AdminError({
  error,
  reset
}:{
  error:Error&{digest?:string};
  reset:()=>void;
}){
  useEffect(()=>{
    console.error("ADMIN_UI_ERROR",error);
  },[error]);

  return <main className="adminPage">
    <section className="adminEmptyState">
      <strong>O módulo encontrou um erro.</strong>
      <p>Nenhuma operação será considerada concluída até a tela carregar novamente.</p>
      <button className="adminPrimaryAction" onClick={reset}>Tentar novamente</button>
    </section>
  </main>;
}
