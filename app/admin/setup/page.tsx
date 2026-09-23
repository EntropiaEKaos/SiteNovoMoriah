import {prisma} from "../../../lib/prisma";
import {bootstrapSuperAdmin} from "./actions";

export const dynamic="force-dynamic";

export default async function SuperAdminSetup({searchParams}:{searchParams:Promise<{error?:string}>}){
  const hasSuperAdmin=Boolean(await prisma.adminUser.findFirst({where:{role:"SUPERADMIN"},select:{id:true}}));
  const q=await searchParams;
  const message=q.error==="token"?"Token de configuração inicial inválido.":q.error==="user"?"Use de 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.":q.error==="match"?"As senhas não coincidem.":q.error==="password"?"A senha precisa ter pelo menos 12 caracteres.":q.error==="create"?"Não foi possível salvar o Super Admin. Tente novamente.":null;
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#111",padding:24}}>
    <form action={bootstrapSuperAdmin} style={{width:"min(460px,100%)",background:"#fff",padding:38,borderTop:"8px solid #ffd400"}}>
      <small>MORIAH CMS • {hasSuperAdmin?"RECUPERAÇÃO DE ACESSO":"CONFIGURAÇÃO INICIAL"}</small>
      <h1 style={{fontSize:36}}>{hasSuperAdmin?"Recuperar Super Admin":"Criar Super Admin"}</h1>
      <p>{hasSuperAdmin
        ?"Já existe um Super Admin neste banco. Informe o token privado para redefinir com segurança o usuário e a senha desse acesso."
        :"Ainda não existe um Super Admin. Informe o token privado para criar o primeiro acesso administrativo."}</p>
      {message&&<p style={{background:"#fee",padding:12}}>{message}</p>}
      <label>Token de configuração<input type="password" name="bootstrapToken" required autoComplete="off" style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Usuário<input name="username" required autoComplete="username" minLength={3} maxLength={40} style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Senha<input type="password" name="password" required autoComplete="new-password" minLength={12} style={{width:"100%",padding:14,margin:"8px 0 20px"}}/></label>
      <label>Confirmar senha<input type="password" name="confirmation" required autoComplete="new-password" minLength={12} style={{width:"100%",padding:14,margin:"8px 0 24px"}}/></label>
      <button style={{width:"100%",padding:15,border:0,background:"#ffd400",fontWeight:800}}>{hasSuperAdmin?"Redefinir Super Admin":"Criar Super Admin"}</button>
    </form>
  </main>
}
