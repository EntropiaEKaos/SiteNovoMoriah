import {redirect} from "next/navigation";
import {isAdmin} from "../../../lib/admin-auth";
import {loginAdmin} from "./actions";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  if(await isAdmin())redirect("/admin");

  const q=await searchParams;
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#111",padding:24}}>
    <form action={loginAdmin} style={{width:"min(420px,100%)",background:"#fff",padding:38,borderTop:"8px solid #ffd400"}}>
      <small>MORIAH CMS</small>
      <h1 style={{fontSize:38}}>Acesso administrativo</h1>
      {q.error&&<p style={{background:"#fee",padding:12}}>Usuário ou senha inválidos.</p>}
      <label>Usuário<input name="user" required autoComplete="username" style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Senha<input type="password" name="password" required autoComplete="current-password" style={{width:"100%",padding:14,margin:"8px 0 24px"}}/></label>
      <button style={{width:"100%",padding:15,border:0,background:"#ffd400",fontWeight:800}}>Entrar</button>
    </form>
  </main>;
}
