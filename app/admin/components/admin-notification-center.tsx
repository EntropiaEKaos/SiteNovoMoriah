import Link from "next/link";
import {Bell,Check,CheckCheck} from "lucide-react";
import {markAdminNotificationRead,markAllAdminNotificationsRead} from "./notification-center-actions";

type Item={
  id:string;
  title:string;
  body:string;
  actionUrl:string|null;
  createdAt:Date;
  read:boolean;
};

function when(date:Date){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
}

export default function AdminNotificationCenter({items,unread}:{items:Item[];unread:number}){
  return <details className="adminBell">
    <summary aria-label={"Notificações do Admin. "+unread+" não lidas."}>
      <Bell size={18}/>
      {unread>0&&<b>{unread>99?"99+":unread}</b>}
    </summary>
    <div className="adminBellPanel">
      <header>
        <div><small>CENTRAL OPERACIONAL</small><strong>Notificações</strong></div>
        {unread>0&&<form action={markAllAdminNotificationsRead}><button title="Marcar todas como lidas"><CheckCheck size={16}/></button></form>}
      </header>
      <div className="adminBellFeed">
        {items.length?items.map(item=><article key={item.id} className={item.read?"":"isUnread"}>
          <div>
            <small>{when(item.createdAt)}</small>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </div>
          <div className="adminBellActions">
            {item.actionUrl&&<Link href={item.actionUrl}>Abrir</Link>}
            {!item.read&&<form action={markAdminNotificationRead}>
              <input type="hidden" name="notificationId" value={item.id}/>
              <button title="Marcar como lida"><Check size={14}/></button>
            </form>}
          </div>
        </article>):<div className="adminBellEmpty">Nenhuma notificação operacional ainda.</div>}
      </div>
      <Link href="/admin/notificacoes" className="adminBellFooter">Abrir central completa →</Link>
    </div>
  </details>;
}
