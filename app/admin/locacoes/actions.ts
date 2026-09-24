"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {normalizeMediaUrl} from "../../../lib/media-url";
import {prisma} from "../../../lib/prisma";
import {queueSystemNotification} from "../../../lib/system-notifications";

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}
function moneyCents(formData:FormData,name:string,required=false){
  const raw=String(formData.get(name)||"").trim().replace(",",".");
  if(!raw){
    if(required)throw new Error("Informe o valor.");
    return null;
  }
  const value=Number(raw);
  if(!Number.isFinite(value)||value<0)throw new Error("Valor inválido.");
  return Math.round(value*100);
}
function dateTime(value:FormDataEntryValue|null){
  const raw=String(value||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw))throw new Error("Data/hora inválida.");
  const parsed=new Date(raw+":00-03:00");
  if(Number.isNaN(parsed.getTime()))throw new Error("Data/hora inválida.");
  return parsed;
}
function refresh(){
  revalidatePath("/admin/locacoes");
  revalidatePath("/admin/notificacoes");
}

export async function createRentalItem(formData:FormData){
  await requireAdmin();
  const name=String(formData.get("name")||"").trim().slice(0,140);
  const category=String(formData.get("category")||"BIKE").trim().toUpperCase().slice(0,60)||"OUTRO";
  const quantityTotal=Number(formData.get("quantityTotal")||1);
  const hourlyPriceCents=moneyCents(formData,"hourlyPrice");
  const dailyPriceCents=moneyCents(formData,"dailyPrice");
  const depositCents=moneyCents(formData,"deposit")||0;
  if(!name||!Number.isInteger(quantityTotal)||quantityTotal<1||quantityTotal>10000)throw new Error("Item de locação inválido.");
  if(hourlyPriceCents==null&&dailyPriceCents==null)throw new Error("Informe preço por hora, diária ou ambos.");

  await prisma.rentalItem.create({
    data:{
      name,category,quantityTotal,hourlyPriceCents,dailyPriceCents,depositCents,
      description:text(formData,"description",3000),
      imageUrl:normalizeMediaUrl(formData.get("imageUrl")),
      notes:text(formData,"notes",3000),
      sortOrder:Number(formData.get("sortOrder")||100)||100,
      active:formData.get("active")==="on"
    }
  });
  refresh();
}

export async function updateRentalItem(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const name=String(formData.get("name")||"").trim().slice(0,140);
  const category=String(formData.get("category")||"OUTRO").trim().toUpperCase().slice(0,60);
  const quantityTotal=Number(formData.get("quantityTotal")||1);
  const hourlyPriceCents=moneyCents(formData,"hourlyPrice");
  const dailyPriceCents=moneyCents(formData,"dailyPrice");
  const depositCents=moneyCents(formData,"deposit")||0;
  if(!id||!name||!Number.isInteger(quantityTotal)||quantityTotal<1||quantityTotal>10000)throw new Error("Item inválido.");
  if(hourlyPriceCents==null&&dailyPriceCents==null)throw new Error("Informe preço por hora, diária ou ambos.");

  const activeUnits=await prisma.rentalOrder.aggregate({
    where:{itemId:id,status:"ACTIVE"},
    _sum:{quantity:true}
  });
  if((activeUnits._sum.quantity||0)>quantityTotal)throw new Error("A quantidade não pode ficar abaixo do total atualmente alugado.");

  await prisma.rentalItem.update({
    where:{id},
    data:{
      name,category,quantityTotal,hourlyPriceCents,dailyPriceCents,depositCents,
      description:text(formData,"description",3000),
      imageUrl:normalizeMediaUrl(formData.get("imageUrl")),
      notes:text(formData,"notes",3000),
      sortOrder:Number(formData.get("sortOrder")||100)||100,
      active:formData.get("active")==="on"
    }
  });
  refresh();
}

export async function createBikePreset(){
  await requireAdmin();
  const existing=await prisma.rentalItem.findFirst({where:{category:"BIKE"}});
  if(existing)return;
  await prisma.rentalItem.create({
    data:{
      name:"Bicicleta",
      category:"BIKE",
      description:"Bicicleta para locação aos hóspedes.",
      quantityTotal:2,
      hourlyPriceCents:1500,
      dailyPriceCents:6000,
      depositCents:0,
      active:true,
      sortOrder:10
    }
  });
  refresh();
}

export async function startRental(formData:FormData){
  const actor=await requireAdmin();
  const itemId=String(formData.get("itemId")||"");
  const guestId=String(formData.get("guestId")||"")||null;
  const bookingId=String(formData.get("bookingId")||"")||null;
  const renterName=String(formData.get("renterName")||"").trim().slice(0,160);
  const phone=text(formData,"phone",60);
  const quantity=Number(formData.get("quantity")||1);
  const pricingMode=String(formData.get("pricingMode")||"HOURLY").toUpperCase();
  const startAt=dateTime(formData.get("startAt"));
  const dueAt=dateTime(formData.get("dueAt"));
  if(!itemId||!renterName||!Number.isInteger(quantity)||quantity<1||!["HOURLY","DAILY"].includes(pricingMode)||!(startAt<dueAt)){
    throw new Error("Dados da locação inválidos.");
  }

  const rental=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${itemId}))`;
    const item=await tx.rentalItem.findUnique({where:{id:itemId}});
    if(!item?.active)throw new Error("Item inativo ou inexistente.");

    const overlapping=await tx.rentalOrder.aggregate({
      where:{
        itemId,
        status:"ACTIVE",
        startAt:{lt:dueAt},
        dueAt:{gt:startAt}
      },
      _sum:{quantity:true}
    });
    const used=overlapping._sum.quantity||0;
    if(used+quantity>item.quantityTotal)throw new Error("Quantidade indisponível para o período.");

    const unitPriceCents=pricingMode==="HOURLY"?item.hourlyPriceCents:item.dailyPriceCents;
    if(unitPriceCents==null)throw new Error("Este item não possui preço para a modalidade escolhida.");

    const durationMs=dueAt.getTime()-startAt.getTime();
    const units=pricingMode==="HOURLY"
      ?Math.max(1,Math.ceil(durationMs/3600000))
      :Math.max(1,Math.ceil(durationMs/86400000));
    const totalCents=units*unitPriceCents*quantity;

    const created=await tx.rentalOrder.create({
      data:{
        itemId,guestId,bookingId,renterName,phone,quantity,pricingMode,
        unitPriceCents,startAt,dueAt,totalCents,
        depositCents:item.depositCents*quantity,
        paymentStatus:String(formData.get("paymentStatus")||"PENDING")==="PAID"?"PAID":"PENDING",
        notes:text(formData,"notes",2000)
      },
      include:{item:true}
    });
    await tx.adminAuditLog.create({
      data:{
        actorId:actor.userId,
        action:"RENTAL_STARTED",
        targetType:"RentalOrder",
        targetId:created.id,
        details:{item:item.name,quantity,pricingMode,totalCents,dueAt:dueAt.toISOString()}
      }
    });
    return created;
  });

  await queueSystemNotification({
    module:"LOCACOES",
    eventKey:"RENTAL_STARTED",
    recipient:rental.phone,
    dedupeKey:"rental-start:"+rental.id,
    variables:{
      quantity:rental.quantity,
      item:rental.item.name,
      guest:rental.renterName,
      dueAt:rental.dueAt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})
    }
  });
  refresh();
}

export async function returnRental(formData:FormData){
  const actor=await requireAdmin();
  const id=String(formData.get("id")||"");
  const paymentStatus=String(formData.get("paymentStatus")||"").toUpperCase();
  if(!id)throw new Error("Locação inválida.");

  const rental=await prisma.$transaction(async tx=>{
    const current=await tx.rentalOrder.findUnique({where:{id},include:{item:true}});
    if(!current||current.status!=="ACTIVE")throw new Error("Locação não está ativa.");
    const updated=await tx.rentalOrder.update({
      where:{id},
      data:{
        status:"RETURNED",
        returnedAt:new Date(),
        paymentStatus:paymentStatus==="PAID"?"PAID":current.paymentStatus
      },
      include:{item:true}
    });
    await tx.adminAuditLog.create({
      data:{
        actorId:actor.userId,
        action:"RENTAL_RETURNED",
        targetType:"RentalOrder",
        targetId:id,
        details:{item:current.item.name,quantity:current.quantity}
      }
    });
    return updated;
  });

  await queueSystemNotification({
    module:"LOCACOES",
    eventKey:"RENTAL_RETURNED",
    recipient:rental.phone,
    dedupeKey:"rental-return:"+rental.id,
    variables:{item:rental.item.name,guest:rental.renterName}
  });
  refresh();
}

export async function cancelRental(formData:FormData){
  const actor=await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  const rental=await prisma.rentalOrder.findUnique({where:{id},select:{status:true}});
  if(!rental||rental.status!=="ACTIVE")return;
  await prisma.$transaction([
    prisma.rentalOrder.update({where:{id},data:{status:"CANCELLED"}}),
    prisma.adminAuditLog.create({
      data:{actorId:actor.userId,action:"RENTAL_CANCELLED",targetType:"RentalOrder",targetId:id}
    })
  ]);
  refresh();
}

export async function markRentalPaid(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  await prisma.rentalOrder.update({where:{id},data:{paymentStatus:"PAID"}});
  refresh();
}
