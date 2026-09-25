import {prisma} from "../../../lib/prisma";
import {requireSuperAdmin} from "../../../lib/admin-auth";
import {createAdminUser,resetAdminPassword,toggleAdminUser} from "./actions";

export const dynamic="force-dynamic";

export default async function AdminUsers(){
  const session=await requireSuperAdmin();
  const users=await prisma.adminUser.findMany({orderBy:{createdAt:"asc"}});
  const active=users.filter(user=>user.active).length;
  const superAdmins=users.filter(user=>user.role==="SUPERADMIN").length;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>SUPER ADMIN / ACESSO</small>
        <h1>Administradores</h1>
        <p>Gerencie quem pode operar o Command Center. Senhas nunca são exibidas e alterações críticas continuam restritas a Super Admins.</p>
      </div>
      <div className="adminPageHeroActions">
        <span className="adminSecondaryAction">Sessão: {session.username}</span>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Usuários</small><strong>{users.length}</strong></div>
      <div><small>Ativos</small><strong>{active}</strong></div>
      <div><small>Super Admins</small><strong>{superAdmins}</strong></div>
      <div><small>Sua função</small><strong style={{fontSize:18}}>{session.role}</strong></div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <h2>Novo administrador</h2>
        <p>Crie um acesso com senha inicial de pelo menos 12 caracteres.</p>
        <form action={createAdminUser} className="adminFormGrid" data-feedback-success="Usuário administrativo criado.">
          <label className="span2">Usuário
            <input name="username" required minLength={3} maxLength={40} placeholder="usuario"/>
          </label>
          <label className="span2">Senha inicial
            <input name="password" type="password" required minLength={12} placeholder="12+ caracteres"/>
          </label>
          <label>Função
            <select name="role" defaultValue="ADMIN">
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Super Admin</option>
            </select>
          </label>
          <button>Criar acesso</button>
        </form>
      </article>

      <section className="adminStack">
        {users.map(user=><article className="adminListCard" key={user.id}>
          <div className="adminListCardHead">
            <div>
              <small>{user.role}</small>
              <h3>{user.username}</h3>
              <p>Último login: {user.lastLoginAt?user.lastLoginAt.toLocaleString("pt-BR"):"ainda não acessou"}</p>
            </div>
            <span className={"adminChip "+(user.active?"ok":"warn")}>{user.active?"Ativo":"Desativado"}</span>
          </div>

          <div className="adminMetaRow">
            {user.id===session.userId&&<span className="adminChip">Você</span>}
            <span className="adminChip">{user.role}</span>
          </div>

          <div className="adminInlineActions">
            {user.id!==session.userId&&<form action={toggleAdminUser} data-feedback-success="Status do usuário atualizado.">
              <input type="hidden" name="id" value={user.id}/>
              <button>{user.active?"Desativar":"Ativar"}</button>
            </form>}
            <form action={resetAdminPassword} style={{display:"flex",gap:7,flexWrap:"wrap"}} data-feedback-success="Senha redefinida com sucesso.">
              <input type="hidden" name="id" value={user.id}/>
              <input name="password" type="password" minLength={12} required placeholder="Nova senha"/>
              <button>Trocar senha</button>
            </form>
          </div>
        </article>)}
      </section>
    </section>
  </main>;
}
