"use server";import {prisma} from "./prisma";import {requireAdmin} from "./admin-auth";import {revalidatePath} from "next/cache";
export async function createRestaurantCategory(formData:FormData){await requireAdmin();const name=String(formData.get("name")||"").trim();if(!name)throw new Error("Categoria obrigatória.");await prisma.restaurantCategory.create({data:{name}});revalidatePath("/admin/restaurante");}
export async function createRestaurantProduct(formData:FormData){await requireAdmin();const categoryId=String(formData.get("categoryId")||""),name=String(formData.get("name")||"").trim(),price=Number(String(formData.get("price")||"").replace(",",".")),costRaw=String(formData.get("cost")||"").trim(),cost=costRaw===""?null:Number(costRaw.replace(",",".")),stock=Number(formData.get("stockQty")||0),min=Number(formData.get("minStockQty")||0);if(!categoryId||!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0||!Number.isInteger(min)||min<0)throw new Error("Produto inválido.");await prisma.restaurantProduct.create({data:{categoryId,name,description:String(formData.get("description")||"").trim()||null,imageUrl:String(formData.get("imageUrl")||"").trim()||null,sku:String(formData.get("sku")||"").trim()||null,priceCents:Math.round(price*100),costCents:cost!==null&&Number.isFinite(cost)&&cost>=0?Math.round(cost*100):null,stockQty:stock,minStockQty:min,trackStock:formData.get("trackStock")==="on"}});revalidatePath("/admin/restaurante");revalidatePath("/restaurante");}
export async function adjustRestaurantStock(formData:FormData){await requireAdmin();const productId=String(formData.get("productId")||""),quantity=Number(formData.get("quantity")||0),reason=String(formData.get("reason")||"Ajuste manual");if(!productId||!Number.isInteger(quantity)||quantity===0)throw new Error("Ajuste inválido.");await prisma.$transaction(async tx=>{const changed=quantity<0?await tx.restaurantProduct.updateMany({where:{id:productId,stockQty:{gte:Math.abs(quantity)}},data:{stockQty:{increment:quantity}}}):await tx.restaurantProduct.updateMany({where:{id:productId},data:{stockQty:{increment:quantity}}});if(changed.count!==1)throw new Error("Produto inexistente ou estoque insuficiente.");await tx.restaurantStockMovement.create({data:{productId,type:quantity>0?"IN":"OUT",quantity,reason}})});revalidatePath("/admin/restaurante");revalidatePath("/restaurante");}
export async function setRestaurantOrderStatus(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const status=String(formData.get("status")||"");
  if(!["NEW","PREPARING","READY","DELIVERED","CANCELLED"].includes(status))throw new Error("Status inválido.");

  await prisma.$transaction(async tx=>{
    const order=await tx.restaurantOrder.findUnique({
      where:{id},
      include:{items:{include:{product:{include:{recipes:true}}}}}
    });
    if(!order)throw new Error("Pedido não encontrado.");

    if(order.status==="CANCELLED"){
      if(status!=="CANCELLED")throw new Error("Pedido cancelado não pode ser reaberto.");
      return;
    }

    if(status==="CANCELLED"){
      if(!["NEW","PREPARING","READY"].includes(order.status)){
        throw new Error("Pedido entregue exige fluxo de estorno, não cancelamento.");
      }

      const existingCharge=await tx.restaurantRoomCharge.findUnique({where:{orderId:id}});
      if(existingCharge&&existingCharge.status!=="OPEN"){
        throw new Error("Consumo já liquidado exige estorno financeiro.");
      }

      const claimed=await tx.restaurantOrder.updateMany({
        where:{id,status:{not:"CANCELLED"}},
        data:{status:"CANCELLED",cancelledAt:new Date()}
      });
      if(claimed.count!==1)return;

      for(const item of order.items){
        if(item.product.trackStock){
          await tx.restaurantProduct.update({
            where:{id:item.productId},
            data:{stockQty:{increment:item.quantity}}
          });
          await tx.restaurantStockMovement.create({
            data:{
              productId:item.productId,
              type:"RETURN",
              quantity:item.quantity,
              reason:"Cancelamento "+id,
              orderId:id
            }
          });
        }

        for(const recipe of item.product.recipes){
          const quantity=recipe.quantity*item.quantity;
          await tx.restaurantIngredient.update({
            where:{id:recipe.ingredientId},
            data:{stockQty:{increment:quantity}}
          });
          await tx.restaurantIngredientMovement.create({
            data:{
              ingredientId:recipe.ingredientId,
              type:"RETURN",
              quantity,
              reason:"Cancelamento "+id,
              orderId:id
            }
          });
        }
      }

      if(existingCharge?.status==="OPEN"){
        await tx.restaurantRoomCharge.update({
          where:{orderId:id},
          data:{status:"CANCELLED"}
        });
      }
      return;
    }

    const allowed:Record<string,string[]>={
      NEW:["PREPARING"],
      PREPARING:["READY"],
      READY:["DELIVERED"]
    };

    if(status!==order.status&&!allowed[order.status]?.includes(status)){
      throw new Error("Transição de pedido inválida.");
    }

    if(status!==order.status){
      await tx.restaurantOrder.update({
        where:{id},
        data:{
          status,
          ...(status==="PREPARING"?{preparingAt:new Date()}:{}),
          ...(status==="READY"?{readyAt:new Date()}:{ }),
          ...(status==="DELIVERED"?{deliveredAt:new Date()}:{ })
        }
      });
    }
  });

  revalidatePath("/admin/restaurante/pedidos");
  revalidatePath("/admin/restaurante");
}

export async function saveRestaurantSettings(formData:FormData){
  await requireAdmin();
  const openTime=String(formData.get("openTime")||"07:00");
  const closeTime=String(formData.get("closeTime")||"22:00");
  const prepTargetMinutes=Number(formData.get("prepTargetMinutes")||25);

  if(!/^\d{2}:\d{2}$/.test(openTime)||!/^\d{2}:\d{2}$/.test(closeTime)){
    throw new Error("Horário inválido.");
  }
  if(!Number.isInteger(prepTargetMinutes)||prepTargetMinutes<5||prepTargetMinutes>180){
    throw new Error("Meta de preparo inválida.");
  }

  const data={
    openTime,
    closeTime,
    acceptingOrders:formData.get("acceptingOrders")==="on",
    roomChargeEnabled:formData.get("roomChargeEnabled")==="on",
    prepTargetMinutes,
    kdsSoundEnabled:formData.get("kdsSoundEnabled")==="on"
  };

  await prisma.restaurantSettings.upsert({
    where:{id:"main"},
    create:{id:"main",...data},
    update:data
  });

  revalidatePath("/admin/restaurante");
  revalidatePath("/admin/restaurante/pedidos");
  revalidatePath("/restaurante");
}

export async function createIngredient(formData:FormData){await requireAdmin();const name=String(formData.get("name")||"").trim(),unit=String(formData.get("unit")||"un").trim(),stock=Number(formData.get("stockQty")||0),min=Number(formData.get("minStockQty")||0),cost=Number(String(formData.get("costPerUnit")||0).replace(",","."));if(!name||!unit||![stock,min,cost].every(Number.isFinite)||stock<0||min<0||cost<0)throw new Error("Insumo inválido.");await prisma.restaurantIngredient.create({data:{name,unit,stockQty:stock,minStockQty:min,costPerUnitCents:Math.round(cost*100)}});revalidatePath("/admin/restaurante/insumos");}
export async function adjustIngredientStock(formData:FormData){await requireAdmin();const ingredientId=String(formData.get("ingredientId")||""),q=Number(formData.get("quantity")||0),reason=String(formData.get("reason")||"Ajuste manual");if(!ingredientId||!Number.isFinite(q)||q===0)throw new Error("Ajuste inválido.");await prisma.$transaction(async tx=>{const i=await tx.restaurantIngredient.findUnique({where:{id:ingredientId}});if(!i||i.stockQty+q<0)throw new Error("Estoque de insumo insuficiente.");await tx.restaurantIngredient.update({where:{id:ingredientId},data:{stockQty:{increment:q}}});await tx.restaurantIngredientMovement.create({data:{ingredientId,type:q>0?"IN":"OUT",quantity:q,reason}})});revalidatePath("/admin/restaurante/insumos");}
export async function addRecipeItem(formData:FormData){await requireAdmin();const productId=String(formData.get("productId")||""),ingredientId=String(formData.get("ingredientId")||""),quantity=Number(formData.get("quantity")||0);if(!productId||!ingredientId||!Number.isFinite(quantity)||quantity<=0)throw new Error("Ficha técnica inválida.");await prisma.restaurantRecipeItem.upsert({where:{productId_ingredientId:{productId,ingredientId}},create:{productId,ingredientId,quantity},update:{quantity}});revalidatePath("/admin/restaurante/insumos");}

export async function createModifierGroup(formData:FormData){await requireAdmin();const name=String(formData.get("name")||"").trim(),max=Number(formData.get("maxSelect")||1);if(!name||!Number.isInteger(max)||max<1)throw new Error("Grupo inválido.");await prisma.restaurantModifierGroup.create({data:{name,required:formData.get("required")==="on",minSelect:formData.get("required")==="on"?1:0,maxSelect:max}});revalidatePath("/admin/restaurante/adicionais");}
export async function createModifierOption(formData:FormData){await requireAdmin();const groupId=String(formData.get("groupId")||""),name=String(formData.get("name")||"").trim(),price=Number(String(formData.get("price")||0).replace(",","."));if(!groupId||!name||!Number.isFinite(price)||price<0)throw new Error("Adicional inválido.");await prisma.restaurantModifierOption.create({data:{groupId,name,priceCents:Math.round(price*100)}});revalidatePath("/admin/restaurante/adicionais");}
export async function linkModifierGroup(formData:FormData){await requireAdmin();const productId=String(formData.get("productId")||""),groupId=String(formData.get("groupId")||"");if(!productId||!groupId)throw new Error("Vínculo inválido.");await prisma.restaurantProductModifierGroup.upsert({where:{productId_groupId:{productId,groupId}},create:{productId,groupId},update:{}});revalidatePath("/admin/restaurante/adicionais");}

export async function recordIngredientWaste(formData:FormData){await requireAdmin();const ingredientId=String(formData.get("ingredientId")||""),quantity=Number(formData.get("quantity")||0),reason=String(formData.get("reason")||"Desperdício");if(!ingredientId||!Number.isFinite(quantity)||quantity<=0)throw new Error("Perda inválida.");await prisma.$transaction(async tx=>{const changed=await tx.restaurantIngredient.updateMany({where:{id:ingredientId,stockQty:{gte:quantity}},data:{stockQty:{decrement:quantity}}});if(changed.count!==1)throw new Error("Insumo inexistente ou estoque insuficiente.");await tx.restaurantIngredientMovement.create({data:{ingredientId,type:"WASTE",quantity:-quantity,reason}})});revalidatePath("/admin/restaurante/insumos");revalidatePath("/admin/restaurante/bi");}
