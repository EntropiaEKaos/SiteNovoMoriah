import type {Metadata,Viewport} from "next";
import Link from "next/link";
import {getAdminSession} from "../../lib/admin-auth";
import {prisma} from "../../lib/prisma";
import AdminNavigation from "./components/admin-navigation";
import {logoutAdmin} from "./login/actions";
import AdminPresenceControl from "./components/admin-presence-control";
import AdminPwaRegister from "./components/admin-pwa-register";
import AdminNotificationCenter from "./components/admin-notification-center";
import AdminActionFeedback from "./components/admin-action-feedback";

export const metadata:Metadata={
  title:{default:"Moriah Admin",template:"%s | Moriah Admin"},
  description:"Central administrativa da Pousada Moriah",
  manifest:"/admin/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Moriah Admin",statusBarStyle:"black-translucent"},
  icons:{icon:"/icon.svg",apple:"/icon.svg"}
};
export const viewport:Viewport={themeColor:"#0b2631"};

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

  const [notificationRows,notificationReadRows]=await Promise.all([
    prisma.notificationMessage.findMany({
      where:{channel:"IN_APP",status:{not:"CANCELLED"}},
      orderBy:{createdAt:"desc"},
      take:18,
      select:{id:true,title:true,body:true,actionUrl:true,createdAt:true}
    }),
    prisma.adminNotificationRead.findMany({
      where:{adminUserId:session.userId},
      select:{notificationId:true},
      orderBy:{readAt:"desc"},
      take:250
    })
  ]);
  const readIds=new Set(notificationReadRows.map(row=>row.notificationId));
  const notificationItems=notificationRows.map(row=>({...row,read:readIds.has(row.id)}));
  const unread=notificationItems.filter(row=>!row.read).length;

  return <div className="adminApp"><AdminPwaRegister/><AdminActionFeedback/>
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
        <div className="adminTopbarTools">
          <AdminNotificationCenter items={notificationItems} unread={unread}/>
          <AdminPresenceControl
            initialOnDuty={onDuty}
            initialOnDutySince={user?.onDutySince?.toISOString()||null}
            schemaReady={presenceSchemaReady}
          />
        </div>
        <div className="adminTopbarMeta"><span>PRODUÇÃO</span><small>CMS • PMS • CHANNEL • FOOD</small></div>
      </header>
      {children}
    </div>
  </div>;
}
