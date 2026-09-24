import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../../../lib/prisma";
import {requireAdmin} from "../../../../../../lib/admin-auth";
import {setKitchenItemStatus} from "../../../../../../lib/kitchen-actions";
import KdsAutoRefresh from "../../../pedidos/kds-auto-refresh";
import KitchenNav from "../../kitchen-nav";

export const dynamic="force-dynamic";

const minutes=(start:Date,end=new Date())=>Math.max(0,Math.floor((end.getTime()-start.getTime())/60000));

export default async function Page({params}:{params:Promise<{id:string}>}){
  const session=await requireAdmin();
  const {id}=await params;
  const [station,settings,orders]=await Promise.all([
    prisma.restaurantStation.findUnique({where:{id}}),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.restaurantOrder.findMany({
      where:{
        status:{in:["NEW","PREPARING","READY"]},
        items:{some:{stationId:id,kitchenStatus:{not:"READY"}}}
      },
      include:{
        booking:{include:{accommodation:true}},
        items:{
          where:{stationId:id},
          include:{modifiers:true},
          orderBy:{id:"asc"}
        }
      },
      orderBy:[{priority:"desc"},{createdAt:"asc"}]
    })
  ]);
  if(!station)notFound();

  const now=new Date();
  const warning=settings?.kitchenWarningMinutes||20;
  const critical=settings?.kitchenCriticalMinutes||35;
  const pendingUnits=orders.reduce((sum,order)=>sum+order.items.filter(item=>item.kitchenStatus!=="READY").reduce((s,item)=>s+item.quantity,0),0);

  return <main className="adminPage kitchen40 kitchenStationScreen">
    <section className="kitchenStationScreenHero" style={{borderColor:station.color}}>
      <div>
        <small>MORIAH KITCHEN 4.1 • ESTAÇÃO</small>
        <h1>{station.name}</h1>
        <p>{station.description||"Tela dedicada de produção."}</p>
      </div>
      <div>
        <strong>{pendingUnits}</strong>
        <span>unidades pendentes</span>
      </div>
    </section>

    <KitchenNav/>

    <KdsAutoRefresh
      orderIds={orders.map(order=>order.id)}
      soundEnabled={settings?.kdsSoundEnabled!==false}
      pendingNotifications={0}
    />

    <div className="kitchenStationScreenTop">
      <span>Operador: <b>{session.username}</b></span>
      <span>Meta da estação: <b>{station.targetMinutes} min</b></span>
      <Link href="/admin/restaurante/pedidos">Voltar ao KDS geral →</Link>
    </div>

    <section className="kitchenStationOrders">
      {orders.map(order=>{
        const elapsed=minutes(order.preparingAt||order.createdAt,now);
        const severity=elapsed>=critical?"critical":elapsed>=warning?"warning":"normal";
        return <article className={"kitchenStationOrder is-"+severity+(order.priority==="URGENT"?" isUrgent":"")} key={order.id}>
          <header>
            <div>
              <small>#{order.id.slice(-6).toUpperCase()} • {order.createdAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>
              <h2>{order.guestName}</h2>
              <p>{order.roomLabel||order.booking?.accommodation?.roomNumber||order.booking?.accommodation?.name||"Retirada / recepção"}</p>
            </div>
            <div className="kitchenStationTimer"><b>{elapsed}</b><span>MIN</span></div>
          </header>

          {order.priority==="URGENT"&&<div className="kitchenUrgent">URGENTE • FAZER PRIMEIRO</div>}

          <div className="kitchenStationItemList">
            {order.items.map(item=><div className={"kitchenStationItem status-"+item.kitchenStatus.toLowerCase()} key={item.id}>
              <div>
                <div className="kitchenStationItemTitle"><strong>{item.quantity}× {item.nameSnapshot}</strong><span>{item.kitchenStatus}</span></div>
                {item.modifiers.length>0&&<small>{item.modifiers.map(modifier=>modifier.nameSnapshot).join(" • ")}</small>}
                {item.kitchenInstructionsSnapshot&&<p>{item.kitchenInstructionsSnapshot}</p>}
                {item.notes&&<em>OBS. {item.notes}</em>}
              </div>
              <div>
                {item.kitchenStatus==="PENDING"&&<form action={setKitchenItemStatus}>
                  <input type="hidden" name="itemId" value={item.id}/>
                  <input type="hidden" name="status" value="PREPARING"/>
                  <button className="start">INICIAR</button>
                </form>}
                {item.kitchenStatus==="PREPARING"&&<form action={setKitchenItemStatus}>
                  <input type="hidden" name="itemId" value={item.id}/>
                  <input type="hidden" name="status" value="READY"/>
                  <button className="ready">PRONTO</button>
                </form>}
              </div>
            </div>)}
          </div>
        </article>;
      })}

      {orders.length===0&&<div className="kitchenStationClear">
        <strong>ESTAÇÃO LIVRE</strong>
        <span>Nenhum item pendente para {station.name}.</span>
      </div>}
    </section>
  </main>;
}
