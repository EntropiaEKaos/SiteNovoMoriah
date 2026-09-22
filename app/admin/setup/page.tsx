import {redirect} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import {bootstrapSuperAdmin} from "./actions";

export const dynamic="force-dynamic";

export default async function SuperAdminSetup({searchParams}:{searchParams:Promise<{error?:string}>}){
  if(await prisma.adminUser.count())redirect("/admin/login");
  const q=await searchParams;
  const message=q.error==="user"?"Use de 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.":q.error==="match"?"As senhas não coincidem.":q.error==="password"?"A senha precisa ter pelo menos 12 caracteres.":null;
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#111",padding:24}}>
    <form action={bootstrapSuperAdmin} style={{width:"min(460px,100%)",background:"#fff",padding:38,borderTop:"8px solid #ffd400"}}>
      <small>MORIAH CMS • CONFIGURAÇÃO INICIAL</small>
      <h1 style={{fontSize:36}}>Criar Super Admin</h1>
      <p>Esta página funciona somente enquanto não existir nenhum administrador. Depois da primeira criação, ela é desativada automaticamente.</p>
      {message&&<p style={{background:"#fee",padding:12}}>{message}</p>}
      <label>Usuário<input name="username" required autoComplete="username" minLength={3} maxLength={40} style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Senha<input type="password" name="password" required autoComplete="new-password" minLength={12} style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Confirmar senha<input type="password" name="confirmation" required autoComplete="new-password" minLength={12} style={{width:"100%",padding:14,margin:"8px 0 24px"}}/></label>
      <button style={{width:"100%",padding:15,border:0,background:"#ffd400",fontWeight:800}}>Criar Super Admin</button>
    </form>
  </main>
}
