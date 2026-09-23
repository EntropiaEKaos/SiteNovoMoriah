import Link from "next/link";
import {getAdminSession} from "../../lib/admin-auth";
import AdminNavigation from "./components/admin-navigation";
import {logoutAdmin} from "./login/actions";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await getAdminSession();
  if(!session)return <div>{children}</div>;

  return <div className="adminApp">
    <aside className="adminSidebar">
      <div className="adminBrand">
        <span className="adminBrandMark">M</span>
        <div><b>MORIAH</b><small>COMMAND CENTER</small></div>
      </div>

      <AdminNavigation superAdmin={session.role==="SUPERADMIN"}/>

      <div className="adminProfile">
        <div className="adminAvatar">{session.username.slice(0,1).toUpperCase()}</div>
        <div><strong>{session.username}</strong><small>{session.role}</small></div>
      </div>

      <div className="adminSideActions">
        <Link href="/">Ver site ↗</Link>
        <form action={logoutAdmin}><button>Sair</button></form>
      </div>
    </aside>

    <div className="adminWorkspace">
      <header className="adminTopbar">
        <div className="adminTopbarStatus"><span className="adminLiveDot"/> Operação Moriah</div>
        <div className="adminTopbarMeta"><span>PRODUÇÃO</span><small>CMS • PMS • CHANNEL • FOOD</small></div>
      </header>
      {children}
    </div>
  </div>;
}
