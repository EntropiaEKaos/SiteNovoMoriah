import Link from "next/link";
import {getAdminSession} from "../../lib/admin-auth";
import {prisma} from "../../lib/prisma";
import AdminNavigation from "./components/admin-navigation";
import {logoutAdmin} from "./login/actions";
import {endPresence,startPresence} from "./presenca/actions";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await getAdminSession();
  if(!session)return <div>{children}</div>;

  let user:{onDuty:boolean;onDutySince:Date|null}|null=null;
  let presenceSchemaReady=true;

  try{
    user=await prisma.adminUser.findUnique({
      where:{id:session.userId},
      select:{onDuty:true,onDutySince:true}
    });
  }catch(error){
    presenceSchemaReady=false;
    console.error("ADMIN_PRESENCE_SCHEMA_PENDING",error);
  }

  const onDuty=Boolean(user?.onDuty);

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
        <div className="adminPresenceBox">
          {presenceSchemaReady?<>
            <span>{onDuty?"Em atendimento":"Fora de atendimento"}{onDuty&&user?.onDutySince?<small> desde {user.onDutySince.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>:null}</span>
            <form action={onDuty?endPresence:startPresence}>
              <button className={"adminPresenceButton "+(onDuty?"isOn":"isOff")}>{onDuty?"Encerrar turno":"Iniciar turno"}</button>
            </form>
          </>:<span><b>Admin disponível</b><small> • presença aguarda migration do Preview</small></span>}
        </div>
        <div className="adminTopbarMeta"><span>PRODUÇÃO</span><small>CMS • PMS • CHANNEL • FOOD</small></div>
      </header>
      {children}
    </div>
  </div>;
}
