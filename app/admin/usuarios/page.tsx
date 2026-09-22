import {prisma} from "../../../lib/prisma";
import {requireSuperAdmin} from "../../../lib/admin-auth";
import {createAdminUser,resetAdminPassword,toggleAdminUser} from "./actions";
export const dynamic="force-dynamic";
export default async function AdminUsers(){
  const session=await requireSuperAdmin();
  const users=await prisma.adminUser.findMany({orderBy:{createdAt:"asc"}});
  return <main style={{padding:"50px 6vw",background:"#f7f7f7",minHeight:"100vh"}}>
    <small>SUPER ADMIN</small><h1 style={{fontSize:44}}>Administradores</h1>
    <p>Conectado como <b>{session.username}</b>. Somente Super Admins podem acessar esta área.</p>
    <section style={{background:"#fff",padding:24,border:"1px solid #e7e7e7",margin:"24px 0"}}>
      <h2>Novo administrador</h2>
      <form action={createAdminUser} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr auto",gap:10}}>
        <input name="username" required minLength={3} maxLength={40} placeholder="Usuário" style={{padding:12}}/>
        <input name="password" type="password" required minLength={12} placeholder="Senha inicial (12+ caracteres)" style={{padding:12}}/>
        <select name="role" defaultValue="ADMIN" style={{padding:12}}><option value="ADMIN">Admin</option><option value="SUPERADMIN">Super Admin</option></select>
        <button style={{padding:"12px 18px",background:"#ffd400",border:0,fontWeight:900}}>Criar</button>
      </form>
    </section>
    <section style={{display:"grid",gap:12}}>{users.map(user=><article key={user.id} style={{background:"#fff",padding:20,border:"1px solid #e7e7e7"}}>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}><b style={{fontSize:20}}>{user.username}</b><span>{user.role}</span><span>{user.active?"Ativo":"Desativado"}</span>{user.id===session.userId&&<span>• você</span>}</div>
      <small>Último login: {user.lastLoginAt?user.lastLoginAt.toLocaleString("pt-BR"):"ainda não acessou"}</small>
      <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
        {user.id!==session.userId&&<form action={toggleAdminUser}><input type="hidden" name="id" value={user.id}/><button>{user.active?"Desativar":"Ativar"}</button></form>}
        <form action={resetAdminPassword} style={{display:"flex",gap:6}}><input type="hidden" name="id" value={user.id}/><input name="password" type="password" minLength={12} required placeholder="Nova senha" style={{padding:8}}/><button>Trocar senha</button></form>
      </div>
    </article>)}</section>
  </main>
}
