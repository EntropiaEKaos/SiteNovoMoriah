import Link from "next/link";
import {getAdminSession} from "../../lib/admin-auth";
import {logoutAdmin} from "./login/actions";

const primary=[
  ["Visão geral","/admin"],["Hospedagens","/admin/hospedagens"],["Reservas","/admin/reservas"],["PMS","/admin/pms"],
  ["Tarifas","/admin/tarifas"],["Promoções","/admin/promocoes"],["Restaurante","/admin/restaurante"],["Galeria","/admin/galeria"],
  ["Blog","/admin/blog"],["Integrações","/admin/integracoes"],["Canais","/admin/canais"],["Configurações","/admin/configuracoes"]
] as const;

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await getAdminSession();
  if(!session)return <div>{children}</div>;
  return <div className="adminApp">
    <aside className="adminSidebar">
      <div className="adminBrand"><span className="adminBrandMark">M</span><div><b>MORIAH</b><small>COMMAND CENTER</small></div></div>
      <nav className="adminNav">{primary.map(([label,href])=><Link key={href} href={href}>{label}<span>↗</span></Link>)}
        {session.role==="SUPERADMIN"&&<Link className="adminSuper" href="/admin/usuarios">Super Admin <span>◆</span></Link>}
      </nav>
      <div className="adminProfile"><div className="adminAvatar">{session.username.slice(0,1).toUpperCase()}</div><div><strong>{session.username}</strong><small>{session.role}</small></div></div>
      <div className="adminSideActions"><Link href="/">Ver site ↗</Link><form action={logoutAdmin}><button>Sair</button></form></div>
    </aside>
    <div className="adminWorkspace"><header className="adminTopbar"><div><span className="adminLiveDot"/> Operação Moriah</div><small>CMS • PMS • CHANNEL • FOOD</small></header>{children}</div>
  </div>;
}
