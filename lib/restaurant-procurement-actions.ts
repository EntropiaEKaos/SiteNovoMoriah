"use server";

import {revalidatePath} from "next/cache";
import {prisma} from "./prisma";
import {requireAdmin} from "./admin-auth";
import {queueSystemNotification} from "./system-notifications";

function txt(fd:FormData,name:string,max=240){
  return String(fd.get(name)||"").trim().slice(0,max)||null;
}
function num(fd:FormData,name:string){
  return Number(String(fd.get(name)||"").replace(",","."));
}
function money(fd:FormData,name:string){
  const value=num(fd,name);
  if(!Number.isFinite(value)||value<0)throw new Error("Valor monetário inválido.");
  return Math.round(value*100);
}

export async function createRestaurantSupplier(fd:FormData){
  await requireAdmin();
  const name=txt(fd,"name",160);
  if(!name)throw new Error("Fornecedor obrigatório.");
  await prisma.restaurantSupplier.create({
    data:{
      name,
      document:txt(fd,"document",80),
      phone:txt(fd,"phone",80),
      email:txt(fd,"email",180),
      contactName:txt(fd,"contactName",160),
      notes:txt(fd,"notes",1000)
    }
  });
  revalidatePath("/admin/restaurante/compras");
}

export async function receiveIngredientPurchase(fd:FormData){
  const session=await requireAdmin();
  const ingredientId=String(fd.get("ingredientId")||"");
  const supplierId=txt(fd,"supplierId",120);
  const purchaseQty=num(fd,"purchaseQty");
  const purchaseUnit=txt(fd,"purchaseUnit",40);
  const conversionFactor=num(fd,"conversionFactor");
  const unitPurchaseCostCents=money(fd,"unitPurchaseCost");
  const invoiceNumber=txt(fd,"invoiceNumber",100);
  const lotCode=txt(fd,"lotCode",100);
  const expiresRaw=txt(fd,"expiresAt",40);
  const expiresAt=expiresRaw?new Date(expiresRaw+"T12:00:00"):null;

  if(!ingredientId||!purchaseUnit||!Number.isFinite(purchaseQty)||purchaseQty<=0||!Number.isFinite(conversionFactor)||conversionFactor<=0){
    throw new Error("Entrada de compra inválida.");
  }

  const result=await prisma.$transaction(async tx=>{
    const ingredient=await tx.restaurantIngredient.findUnique({where:{id:ingredientId}});
    if(!ingredient)throw new Error("Insumo não encontrado.");

    const stockQtyAdded=purchaseQty*conversionFactor;
    const totalCents=Math.round(unitPurchaseCostCents*purchaseQty);
    const unitStockCostCents=Math.round(totalCents/stockQtyAdded);
    const currentValue=ingredient.stockQty*ingredient.costPerUnitCents;
    const incomingValue=stockQtyAdded*unitStockCostCents;
    const nextStock=ingredient.stockQty+stockQtyAdded;
    const weightedCost=nextStock>0?Math.round((currentValue+incomingValue)/nextStock):unitStockCostCents;

    const purchase=await tx.restaurantPurchase.create({
      data:{
        supplierId:supplierId||null,
        invoiceNumber,
        totalCents,
        notes:"Entrada registrada por "+session.username
      }
    });
    await tx.restaurantPurchaseItem.create({
      data:{
        purchaseId:purchase.id,
        ingredientId,
        purchaseQty,
        purchaseUnit,
        conversionFactor,
        stockQtyAdded,
        unitPurchaseCostCents,
        unitStockCostCents,
        totalCents,
        lotCode,
        expiresAt
      }
    });
    const updated=await tx.restaurantIngredient.update({
      where:{id:ingredientId},
      data:{
        stockQty:{increment:stockQtyAdded},
        costPerUnitCents:weightedCost,
        purchaseUnit,
        purchaseToStockFactor:conversionFactor
      }
    });
    await tx.restaurantIngredientMovement.create({
      data:{
        ingredientId,
        type:"PURCHASE",
        quantity:stockQtyAdded,
        reason:"Compra "+(invoiceNumber||purchase.id)
      }
    });
    return {updated,purchase};
  });

  await queueSystemNotification({
    module:"INVENTORY",
    eventKey:"PURCHASE_RECEIVED",
    title:"Entrada de insumo recebida",
    body:result.updated.name+" atualizado para "+String(result.updated.stockQty)+" "+result.updated.unit+".",
    dedupeKey:"purchase:"+result.purchase.id,
    actionUrl:"/admin/restaurante/compras"
  });

  const impacted=await prisma.restaurantProduct.findMany({
    where:{active:true,recipes:{some:{ingredientId}}},
    include:{recipes:{include:{ingredient:true}},category:true}
  });
  for(const product of impacted){
    const theoreticalCost=Math.round(product.recipes.reduce((sum,row)=>sum+row.quantity*row.ingredient.costPerUnitCents,0));
    const target=product.targetCmvPct??product.category.targetCmvPct;
    const currentPct=product.priceCents>0?theoreticalCost/product.priceCents*100:0;
    if(target!=null&&currentPct>target){
      await queueSystemNotification({
        module:"INVENTORY",
        eventKey:"CMV_TARGET_EXCEEDED",
        title:"CMV acima da meta: "+product.name,
        body:"CMV teórico "+currentPct.toFixed(1)+"% • meta "+target.toFixed(1)+"%. Revise preço, ficha ou compra.",
        dedupeKey:"cmv-target:"+product.id+":"+String(Math.round(currentPct*10)),
        actionUrl:"/admin/restaurante/bi"
      });
    }
  }

  revalidatePath("/admin/restaurante/compras");
  revalidatePath("/admin/restaurante/insumos");
  revalidatePath("/admin/restaurante/bi");
}

export async function recordPhysicalInventory(fd:FormData){
  const session=await requireAdmin();
  const ingredientId=String(fd.get("ingredientId")||"");
  const countedQty=num(fd,"countedQty");
  const notes=txt(fd,"notes",500);

  if(!ingredientId||!Number.isFinite(countedQty)||countedQty<0)throw new Error("Contagem inválida.");

  const result=await prisma.$transaction(async tx=>{
    const ingredient=await tx.restaurantIngredient.findUnique({where:{id:ingredientId}});
    if(!ingredient)throw new Error("Insumo não encontrado.");
    const varianceQty=countedQty-ingredient.stockQty;
    const varianceCostCents=Math.round(varianceQty*ingredient.costPerUnitCents);
    const count=await tx.restaurantInventoryCount.create({
      data:{actorName:session.username,notes}
    });
    await tx.restaurantInventoryCountItem.create({
      data:{
        countId:count.id,
        ingredientId,
        systemQty:ingredient.stockQty,
        countedQty,
        varianceQty,
        varianceCostCents
      }
    });
    await tx.restaurantIngredient.update({where:{id:ingredientId},data:{stockQty:countedQty}});
    if(varianceQty!==0){
      await tx.restaurantIngredientMovement.create({
        data:{
          ingredientId,
          type:"INVENTORY",
          quantity:varianceQty,
          reason:"Inventário físico "+count.id+(notes?" • "+notes:"")
        }
      });
    }
    return {ingredient,varianceQty,count};
  });

  if(Math.abs(result.varianceQty)>0){
    await queueSystemNotification({
      module:"INVENTORY",
      eventKey:"COUNT_VARIANCE",
      title:"Divergência de inventário",
      body:result.ingredient.name+" teve ajuste de "+String(result.varianceQty)+" "+result.ingredient.unit+".",
      dedupeKey:"inventory-count:"+result.count.id,
      actionUrl:"/admin/restaurante/compras"
    });
  }

  revalidatePath("/admin/restaurante/compras");
  revalidatePath("/admin/restaurante/insumos");
  revalidatePath("/admin/restaurante/bi");
}

export async function updateIngredientPlanning(fd:FormData){
  await requireAdmin();
  const ingredientId=String(fd.get("ingredientId")||"");
  const targetDaysCover=Number(fd.get("targetDaysCover")||7);
  const purchaseUnit=txt(fd,"purchaseUnit",40);
  const purchaseToStockFactor=num(fd,"purchaseToStockFactor");
  if(!ingredientId||!Number.isInteger(targetDaysCover)||targetDaysCover<1||targetDaysCover>180||!Number.isFinite(purchaseToStockFactor)||purchaseToStockFactor<=0){
    throw new Error("Parâmetros de planejamento inválidos.");
  }
  await prisma.restaurantIngredient.update({
    where:{id:ingredientId},
    data:{targetDaysCover,purchaseUnit,purchaseToStockFactor}
  });
  revalidatePath("/admin/restaurante/compras");
  revalidatePath("/admin/restaurante/insumos");
}

export async function saveCmvTarget(fd:FormData){
  await requireAdmin();
  const productId=String(fd.get("productId")||"");
  const categoryId=String(fd.get("categoryId")||"");
  const raw=String(fd.get("targetCmvPct")||"").trim().replace(",",".");
  const target=raw===""?null:Number(raw);
  if(target!==null&&(!Number.isFinite(target)||target<1||target>99))throw new Error("Meta de CMV inválida.");
  if(productId){
    await prisma.restaurantProduct.update({where:{id:productId},data:{targetCmvPct:target}});
  }else if(categoryId){
    await prisma.restaurantCategory.update({where:{id:categoryId},data:{targetCmvPct:target}});
  }else{
    throw new Error("Produto ou categoria obrigatório.");
  }
  revalidatePath("/admin/restaurante/bi");
  revalidatePath("/admin/restaurante/cardapio");
}
