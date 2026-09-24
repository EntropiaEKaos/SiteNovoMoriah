"use server";

import {revalidatePath} from "next/cache";
import {prisma} from "./prisma";
import {requireAdmin} from "./admin-auth";

function refreshKitchen(){
  revalidatePath("/admin/restaurante");
  revalidatePath("/admin/restaurante/pedidos");
  revalidatePath("/admin/restaurante/cozinha/expedicao");
  revalidatePath("/admin/restaurante/cozinha/producao");
  revalidatePath("/admin/restaurante/cozinha/disponibilidade");
  revalidatePath("/admin/restaurante/cozinha/painel");
  revalidatePath("/admin/restaurante/cozinha/auditoria");
}

function refreshMenu(){
  revalidatePath("/admin/restaurante/cardapio");
  revalidatePath("/restaurante");
}

function clean(value:FormDataEntryValue|null,max=500){
  const text=String(value||"").trim();
  return text?text.slice(0,max):null;
}

function stationCode(value:string){
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,"_")
    .replace(/^_|_$/g,"")
    .slice(0,32);
}

export async function createKitchenStation(formData:FormData){
  await requireAdmin();
  const name=String(formData.get("name")||"").trim().slice(0,100);
  const code=stationCode(String(formData.get("code")||name));
  const targetMinutes=Number(formData.get("targetMinutes")||15);
  const sortOrder=Number(formData.get("sortOrder")||100);
  if(!name||!code||!Number.isInteger(targetMinutes)||targetMinutes<1||targetMinutes>240)throw new Error("Estação inválida.");

  await prisma.restaurantStation.create({
    data:{
      name,
      code,
      description:clean(formData.get("description"),1000),
      color:String(formData.get("color")||"#0b607a").slice(0,20),
      targetMinutes,
      sortOrder:Number.isInteger(sortOrder)?sortOrder:100,
      active:formData.get("active")==="on"
    }
  });
  refreshKitchen();
  revalidatePath("/admin/restaurante/cozinha/estacoes");
}

export async function updateKitchenStation(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const name=String(formData.get("name")||"").trim().slice(0,100);
  const code=stationCode(String(formData.get("code")||name));
  const targetMinutes=Number(formData.get("targetMinutes")||15);
  const sortOrder=Number(formData.get("sortOrder")||100);
  if(!id||!name||!code||!Number.isInteger(targetMinutes)||targetMinutes<1||targetMinutes>240)throw new Error("Estação inválida.");

  await prisma.restaurantStation.update({
    where:{id},
    data:{
      name,
      code,
      description:clean(formData.get("description"),1000),
      color:String(formData.get("color")||"#0b607a").slice(0,20),
      targetMinutes,
      sortOrder:Number.isInteger(sortOrder)?sortOrder:100,
      active:formData.get("active")==="on"
    }
  });
  refreshKitchen();
  revalidatePath("/admin/restaurante/cozinha/estacoes");
}

export async function setKitchenItemStatus(formData:FormData){
  const session=await requireAdmin();
  const itemId=String(formData.get("itemId")||"");
  const nextStatus=String(formData.get("status")||"");
  const note=clean(formData.get("note"),500);
  if(!itemId||!["PENDING","PREPARING","READY"].includes(nextStatus))throw new Error("Status de item inválido.");

  await prisma.$transaction(async tx=>{
    const item=await tx.restaurantOrderItem.findUnique({
      where:{id:itemId},
      include:{order:true,station:true}
    });
    if(!item)throw new Error("Item não encontrado.");
    if(["CANCELLED","DELIVERED"].includes(item.order.status))throw new Error("Pedido encerrado.");

    const allowed:Record<string,string[]>={
      PENDING:["PREPARING"],
      PREPARING:["READY","PENDING"],
      READY:["PREPARING"]
    };
    if(nextStatus!==item.kitchenStatus&&!allowed[item.kitchenStatus]?.includes(nextStatus)){
      throw new Error("Transição de item inválida.");
    }
    if(nextStatus===item.kitchenStatus)return;

    const now=new Date();
    await tx.restaurantOrderItem.update({
      where:{id:itemId},
      data:{
        kitchenStatus:nextStatus,
        ...(nextStatus==="PREPARING"?{startedAt:now,readyAt:null}:{}),
        ...(nextStatus==="READY"?{readyAt:now}:{}),
        ...(nextStatus==="PENDING"?{startedAt:null,readyAt:null}:{})
      }
    });

    await tx.restaurantKitchenEvent.create({
      data:{
        orderId:item.orderId,
        itemId:item.id,
        eventType:nextStatus==="PREPARING"&&item.kitchenStatus==="READY"?"ITEM_REWORK":"ITEM_STATUS",
        fromStatus:item.kitchenStatus,
        toStatus:nextStatus,
        notes:note,
        actorId:session.userId,
        actorName:session.username,
        details:{station:item.station?.name||null,item:item.nameSnapshot}
      }
    });

    const [items,settings]=await Promise.all([
      tx.restaurantOrderItem.findMany({where:{orderId:item.orderId},select:{kitchenStatus:true}}),
      tx.restaurantSettings.findUnique({where:{id:"main"}})
    ]);

    const allReady=items.length>0&&items.every(value=>value.kitchenStatus==="READY");
    const anyStarted=items.some(value=>value.kitchenStatus!=="PENDING");
    const currentOrder=await tx.restaurantOrder.findUnique({where:{id:item.orderId}});
    if(!currentOrder)return;

    if(allReady&&settings?.autoReadyOrder!==false&&currentOrder.status!=="READY"){
      await tx.restaurantOrder.update({
        where:{id:item.orderId},
        data:{status:"READY",readyAt:now,expeditionStatus:"WAITING",pausedAt:null,pauseReason:null}
      });
      await tx.restaurantKitchenEvent.create({
        data:{
          orderId:item.orderId,
          eventType:"ORDER_AUTO_READY",
          fromStatus:currentOrder.status,
          toStatus:"READY",
          actorId:session.userId,
          actorName:session.username
        }
      });
    }else if(anyStarted&&["NEW","READY"].includes(currentOrder.status)){
      const target=settings?.prepTargetMinutes||25;
      await tx.restaurantOrder.update({
        where:{id:item.orderId},
        data:{
          status:"PREPARING",
          preparingAt:currentOrder.preparingAt||now,
          readyAt:null,
          expeditionStatus:"PENDING",
          estimatedReadyAt:new Date(now.getTime()+target*60_000)
        }
      });
      if(currentOrder.status==="NEW"){
        await tx.notificationMessage.updateMany({
          where:{audience:"KITCHEN",recipient:item.orderId,status:"READY"},
          data:{status:"SENT",sentAt:now}
        });
      }
    }
  });

  refreshKitchen();
}

export async function setKitchenOrderPriority(formData:FormData){
  const session=await requireAdmin();
  const orderId=String(formData.get("orderId")||"");
  const priority=String(formData.get("priority")||"NORMAL");
  if(!orderId||!["NORMAL","URGENT"].includes(priority))throw new Error("Prioridade inválida.");

  const order=await prisma.restaurantOrder.update({where:{id:orderId},data:{priority}});
  await prisma.restaurantKitchenEvent.create({
    data:{
      orderId,
      eventType:"ORDER_PRIORITY",
      toStatus:priority,
      actorId:session.userId,
      actorName:session.username
    }
  });
  void order;
  refreshKitchen();
}

export async function toggleKitchenOrderPause(formData:FormData){
  const session=await requireAdmin();
  const orderId=String(formData.get("orderId")||"");
  const order=await prisma.restaurantOrder.findUnique({where:{id:orderId}});
  if(!order)throw new Error("Pedido não encontrado.");
  if(["DELIVERED","CANCELLED"].includes(order.status))throw new Error("Pedido encerrado.");

  const now=new Date();
  const pausing=!order.pausedAt;
  const reason=pausing?clean(formData.get("reason"),300)||"Pausa operacional":null;

  await prisma.restaurantOrder.update({
    where:{id:orderId},
    data:{pausedAt:pausing?now:null,pauseReason:reason}
  });
  await prisma.restaurantKitchenEvent.create({
    data:{
      orderId,
      eventType:pausing?"ORDER_PAUSED":"ORDER_RESUMED",
      notes:reason,
      actorId:session.userId,
      actorName:session.username
    }
  });
  refreshKitchen();
}

export async function releaseKitchenOrder(formData:FormData){
  const session=await requireAdmin();
  const orderId=String(formData.get("orderId")||"");
  const order=await prisma.restaurantOrder.findUnique({
    where:{id:orderId},
    include:{items:{select:{kitchenStatus:true}}}
  });
  if(!order)throw new Error("Pedido não encontrado.");
  if(!order.items.length||order.items.some(item=>item.kitchenStatus!=="READY"))throw new Error("Ainda há itens pendentes.");

  const now=new Date();
  await prisma.$transaction([
    prisma.restaurantOrder.update({
      where:{id:orderId},
      data:{status:"DELIVERED",deliveredAt:now,expeditionStatus:"RELEASED"}
    }),
    prisma.restaurantKitchenEvent.create({
      data:{
        orderId,
        eventType:"EXPEDITION_RELEASED",
        fromStatus:order.status,
        toStatus:"DELIVERED",
        actorId:session.userId,
        actorName:session.username
      }
    })
  ]);
  refreshKitchen();
}

export async function setExpeditionCheck(formData:FormData){
  const session=await requireAdmin();
  const orderId=String(formData.get("orderId")||"");
  const status=String(formData.get("status")||"CHECKING");
  if(!["WAITING","CHECKING"].includes(status))throw new Error("Estado de expedição inválido.");
  await prisma.restaurantOrder.update({where:{id:orderId},data:{expeditionStatus:status}});
  await prisma.restaurantKitchenEvent.create({
    data:{orderId,eventType:"EXPEDITION_STATUS",toStatus:status,actorId:session.userId,actorName:session.username}
  });
  refreshKitchen();
}

export async function quickProductAvailability(formData:FormData){
  await requireAdmin();
  const productId=String(formData.get("productId")||"");
  const mode=String(formData.get("mode")||"AVAILABLE");
  if(!productId)throw new Error("Produto inválido.");

  let data:{soldOut?:boolean;pauseUntil?:Date|null}={};
  if(mode==="SOLD_OUT")data={soldOut:true,pauseUntil:null};
  else if(mode==="AVAILABLE")data={soldOut:false,pauseUntil:null};
  else if(/^PAUSE_(30|60|120)$/.test(mode)){
    const minutes=Number(mode.split("_")[1]);
    data={soldOut:false,pauseUntil:new Date(Date.now()+minutes*60_000)};
  }else throw new Error("Disponibilidade inválida.");

  await prisma.restaurantProduct.update({where:{id:productId},data});
  refreshMenu();
  refreshKitchen();
}

export async function createProductionBatch(formData:FormData){
  const session=await requireAdmin();
  const stationId=String(formData.get("stationId")||"")||null;
  const productId=String(formData.get("productId")||"")||null;
  const ingredientId=String(formData.get("ingredientId")||"")||null;
  const label=String(formData.get("label")||"").trim().slice(0,160);
  const quantity=Number(String(formData.get("quantity")||"0").replace(",","."));
  const unit=String(formData.get("unit")||"un").trim().slice(0,20);
  const expiresRaw=String(formData.get("expiresAt")||"").trim();
  if(!label||!Number.isFinite(quantity)||quantity<=0||!unit)throw new Error("Lote de produção inválido.");

  await prisma.restaurantProductionBatch.create({
    data:{
      stationId,productId,ingredientId,label,quantity,unit,
      expiresAt:expiresRaw?new Date(expiresRaw):null,
      notes:clean(formData.get("notes"),1000),
      actorName:session.username
    }
  });
  revalidatePath("/admin/restaurante/cozinha/producao");
  refreshKitchen();
}

export async function setProductionBatchStatus(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const status=String(formData.get("status")||"CONSUMED");
  if(!id||!["ACTIVE","CONSUMED","DISCARDED"].includes(status))throw new Error("Estado de produção inválido.");
  await prisma.restaurantProductionBatch.update({where:{id},data:{status}});
  revalidatePath("/admin/restaurante/cozinha/producao");
}

export async function saveKitchenSettings(formData:FormData){
  await requireAdmin();
  const warning=Number(formData.get("kitchenWarningMinutes")||20);
  const critical=Number(formData.get("kitchenCriticalMinutes")||35);
  if(!Number.isInteger(warning)||!Number.isInteger(critical)||warning<1||critical<=warning||critical>240){
    throw new Error("Metas de cozinha inválidas.");
  }
  await prisma.restaurantSettings.upsert({
    where:{id:"main"},
    create:{
      id:"main",
      kitchenWarningMinutes:warning,
      kitchenCriticalMinutes:critical,
      stationMode:formData.get("stationMode")==="on",
      expeditionEnabled:formData.get("expeditionEnabled")==="on",
      autoReadyOrder:formData.get("autoReadyOrder")==="on"
    },
    update:{
      kitchenWarningMinutes:warning,
      kitchenCriticalMinutes:critical,
      stationMode:formData.get("stationMode")==="on",
      expeditionEnabled:formData.get("expeditionEnabled")==="on",
      autoReadyOrder:formData.get("autoReadyOrder")==="on"
    }
  });
  refreshKitchen();
}


export async function createDefaultKitchenStations(){
  await requireAdmin();
  const presets=[
    {name:"Chapa",code:"CHAPA",description:"Hambúrgueres, carnes, ovos e grelhados.",color:"#d86138",sortOrder:10,targetMinutes:15},
    {name:"Fritadeira",code:"FRITADEIRA",description:"Frituras, batatas, porções e empanados.",color:"#d89b00",sortOrder:20,targetMinutes:12},
    {name:"Cozinha",code:"COZINHA",description:"Pratos, acompanhamentos e cocção geral.",color:"#0b607a",sortOrder:30,targetMinutes:20},
    {name:"Bebidas",code:"BEBIDAS",description:"Bebidas, sucos e montagem fria.",color:"#17795e",sortOrder:40,targetMinutes:5},
    {name:"Sobremesas",code:"SOBREMESAS",description:"Doces, sobremesas e finalizações frias.",color:"#8b5bb4",sortOrder:50,targetMinutes:8}
  ];
  for(const station of presets){
    await prisma.restaurantStation.upsert({
      where:{code:station.code},
      create:station,
      update:{name:station.name,description:station.description,color:station.color,sortOrder:station.sortOrder,targetMinutes:station.targetMinutes}
    });
  }
  revalidatePath("/admin/restaurante/cozinha/estacoes");
  refreshKitchen();
}
