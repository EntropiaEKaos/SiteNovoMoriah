"use server";import {prisma} from "./prisma";import {requireAdmin} from "./admin-auth";import {revalidatePath} from "next/cache";import {redirect} from "next/navigation";import {normalizeMediaUrl} from "./media-url";
export async function createRestaurantCategory(formData:FormData){await requireAdmin();const name=String(formData.get("name")||"").trim();if(!name)throw new Error("Categoria obrigatória.");await prisma.restaurantCategory.create({data:{name}});revalidatePath("/admin/restaurante");}
export async function createRestaurantProduct(formData:FormData){await requireAdmin();const categoryId=String(formData.get("categoryId")||""),name=String(formData.get("name")||"").trim(),price=Number(String(formData.get("price")||"").replace(",",".")),costRaw=String(formData.get("cost")||"").trim(),cost=costRaw===""?null:Number(costRaw.replace(",",".")),stock=Number(formData.get("stockQty")||0),min=Number(formData.get("minStockQty")||0);if(!categoryId||!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0||!Number.isInteger(min)||min<0)throw new Error("Produto inválido.");await prisma.restaurantProduct.create({data:{categoryId,name,description:String(formData.get("description")||"").trim()||null,imageUrl:normalizeMediaUrl(formData.get("imageUrl")),sku:String(formData.get("sku")||"").trim()||null,priceCents:Math.round(price*100),costCents:cost!==null&&Number.isFinite(cost)&&cost>=0?Math.round(cost*100):null,stockQty:stock,minStockQty:min,trackStock:formData.get("trackStock")==="on"}});revalidatePath("/admin/restaurante");revalidatePath("/restaurante");}
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
      await tx.notificationMessage.updateMany({
        where:{audience:"KITCHEN",recipient:id,status:"READY"},
        data:{status:"CANCELLED"}
      });
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
      const changedAt=new Date();
      await tx.restaurantOrder.update({
        where:{id},
        data:{
          status,
          ...(status==="PREPARING"?{preparingAt:changedAt}:{}),
          ...(status==="READY"?{readyAt:changedAt}:{ }),
          ...(status==="DELIVERED"?{deliveredAt:changedAt}:{ })
        }
      });

      if(status==="PREPARING"){
        await tx.notificationMessage.updateMany({
          where:{audience:"KITCHEN",recipient:id,status:"READY"},
          data:{status:"SENT",sentAt:changedAt}
        });
      }
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


const MENU_DAYS=new Set(["0","1","2","3","4","5","6"]);

function menuText(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}

function menuMoney(formData:FormData,name:string,{required=false}:{required?:boolean}={}){
  const raw=String(formData.get(name)||"").trim();
  if(!raw){
    if(required)throw new Error("Valor obrigatório.");
    return null;
  }
  const value=Number(raw.replace(",","."));
  if(!Number.isFinite(value)||value<0)throw new Error("Valor monetário inválido.");
  return Math.round(value*100);
}

function menuInteger(formData:FormData,name:string,defaultValue:number,min:number,max:number){
  const raw=String(formData.get(name)||"").trim();
  const value=raw===""?defaultValue:Number(raw);
  if(!Number.isInteger(value)||value<min||value>max)throw new Error("Valor numérico inválido.");
  return value;
}

function menuDays(formData:FormData){
  return formData.getAll("availableDays")
    .map(String)
    .filter(value=>MENU_DAYS.has(value))
    .map(Number);
}

function menuList(formData:FormData,name:string,maxItems=20){
  return String(formData.get(name)||"")
    .split(",")
    .map(item=>item.trim())
    .filter(Boolean)
    .slice(0,maxItems);
}

function menuTime(formData:FormData,name:string){
  const value=String(formData.get(name)||"").trim();
  if(!value)return null;
  if(!/^\d{2}:\d{2}$/.test(value))throw new Error("Horário inválido.");
  return value;
}

function revalidateMenu(){
  revalidatePath("/admin/restaurante");
  revalidatePath("/admin/restaurante/cardapio");
  revalidatePath("/restaurante");
}

export async function saveRestaurantMenuSettings(formData:FormData){
  await requireAdmin();

  const data={
    menuTitle:String(formData.get("menuTitle")||"Moriah Food").trim().slice(0,120)||"Moriah Food",
    menuSubtitle:menuText(formData,"menuSubtitle",500),
    menuBannerUrl:normalizeMediaUrl(formData.get("menuBannerUrl"),1000),
    showSoldOut:formData.get("showSoldOut")==="on"
  };

  await prisma.restaurantSettings.upsert({
    where:{id:"main"},
    create:{id:"main",...data},
    update:data
  });

  revalidateMenu();
}

export async function createMenuCategory(formData:FormData){
  await requireAdmin();

  const name=String(formData.get("name")||"").trim().slice(0,120);
  if(!name)throw new Error("Nome da categoria obrigatório.");

  const category=await prisma.restaurantCategory.create({
    data:{
      name,
      description:menuText(formData,"description",1000),
      imageUrl:normalizeMediaUrl(formData.get("imageUrl"),1000),
      sortOrder:menuInteger(formData,"sortOrder",100,0,100000),
      active:formData.get("active")==="on",
      featured:formData.get("featured")==="on",
      availableFrom:menuTime(formData,"availableFrom"),
      availableUntil:menuTime(formData,"availableUntil"),
      availableDays:menuDays(formData)
    }
  });

  revalidateMenu();
  redirect("/admin/restaurante/cardapio?category="+category.id);
}

export async function updateMenuCategory(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const name=String(formData.get("name")||"").trim().slice(0,120);
  if(!id||!name)throw new Error("Categoria inválida.");

  await prisma.restaurantCategory.update({
    where:{id},
    data:{
      name,
      description:menuText(formData,"description",1000),
      imageUrl:normalizeMediaUrl(formData.get("imageUrl"),1000),
      sortOrder:menuInteger(formData,"sortOrder",100,0,100000),
      active:formData.get("active")==="on",
      featured:formData.get("featured")==="on",
      availableFrom:menuTime(formData,"availableFrom"),
      availableUntil:menuTime(formData,"availableUntil"),
      availableDays:menuDays(formData)
    }
  });

  revalidateMenu();
}

export async function moveMenuCategory(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const direction=String(formData.get("direction")||"DOWN");
  const category=await prisma.restaurantCategory.findUnique({where:{id}});
  if(!category)throw new Error("Categoria não encontrada.");

  await prisma.restaurantCategory.update({
    where:{id},
    data:{sortOrder:{increment:direction==="UP"?-10:10}}
  });

  revalidateMenu();
}

export async function deleteMenuCategory(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  if(!id)return;

  const products=await prisma.restaurantProduct.count({where:{categoryId:id}});
  if(products>0)throw new Error("Mova ou arquive os produtos antes de excluir esta categoria.");

  await prisma.restaurantCategory.delete({where:{id}});
  revalidateMenu();
}

function menuProductData(formData:FormData){
  const categoryId=String(formData.get("categoryId")||"");
  const name=String(formData.get("name")||"").trim().slice(0,160);
  const priceCents=menuMoney(formData,"price",{required:true})!;
  const promotionalPriceCents=menuMoney(formData,"promotionalPrice");
  const costCents=menuMoney(formData,"cost");
  const stockQty=menuInteger(formData,"stockQty",0,0,1000000);
  const minStockQty=menuInteger(formData,"minStockQty",0,0,1000000);
  const sortOrder=menuInteger(formData,"sortOrder",100,0,100000);
  const prepRaw=String(formData.get("prepMinutes")||"").trim();
  const prepMinutes=prepRaw===""?null:menuInteger(formData,"prepMinutes",0,1,240);
  const maxPerOrder=menuInteger(formData,"maxPerOrder",20,1,100);

  if(!categoryId||!name)throw new Error("Categoria e nome são obrigatórios.");
  if(promotionalPriceCents!=null&&promotionalPriceCents>=priceCents){
    throw new Error("O preço promocional deve ser menor que o preço normal.");
  }

  return {
    categoryId,
    name,
    description:menuText(formData,"description",4000),
    imageUrl:normalizeMediaUrl(formData.get("imageUrl"),1000),
    priceCents,
    promotionalPriceCents,
    costCents,
    sku:menuText(formData,"sku",80),
    active:formData.get("active")==="on",
    featured:formData.get("featured")==="on",
    soldOut:formData.get("soldOut")==="on",
    badge:menuText(formData,"badge",80),
    tags:menuList(formData,"tags"),
    allergens:menuList(formData,"allergens"),
    sortOrder,
    prepMinutes,
    maxPerOrder,
    allowNotes:formData.get("allowNotes")==="on",
    availableFrom:menuTime(formData,"availableFrom"),
    availableUntil:menuTime(formData,"availableUntil"),
    availableDays:menuDays(formData),
    trackStock:formData.get("trackStock")==="on",
    stockQty,
    minStockQty
  };
}

async function readProductComposition(formData:FormData){
  const requestedGroupIds=[...new Set(
    formData.getAll("modifierGroupIds").map(String).filter(Boolean)
  )];

  const [groups,ingredients]=await Promise.all([
    prisma.restaurantModifierGroup.findMany({
      where:{id:{in:requestedGroupIds}},
      select:{id:true}
    }),
    prisma.restaurantIngredient.findMany({
      select:{id:true}
    })
  ]);

  if(groups.length!==requestedGroupIds.length){
    throw new Error("Um grupo de adicionais não existe mais.");
  }

  const ingredientIds=new Set(ingredients.map(ingredient=>ingredient.id));
  const recipeItems=ingredients
    .map(ingredient=>{
      const raw=String(formData.get("ingredient_"+ingredient.id)||"").trim();
      if(!raw)return null;

      const quantity=Number(raw.replace(",","."));
      if(!Number.isFinite(quantity)||quantity<=0){
        throw new Error("Quantidade inválida na ficha técnica.");
      }

      return {ingredientId:ingredient.id,quantity};
    })
    .filter((item):item is {ingredientId:string;quantity:number}=>Boolean(item))
    .filter(item=>ingredientIds.has(item.ingredientId));

  return {
    groupIds:requestedGroupIds,
    recipeItems
  };
}

export async function createMenuProduct(formData:FormData){
  await requireAdmin();

  const data=menuProductData(formData);
  const composition=await readProductComposition(formData);

  const product=await prisma.$transaction(async tx=>{
    const created=await tx.restaurantProduct.create({data});

    if(composition.groupIds.length){
      await tx.restaurantProductModifierGroup.createMany({
        data:composition.groupIds.map(groupId=>({
          productId:created.id,
          groupId
        })),
        skipDuplicates:true
      });
    }

    if(composition.recipeItems.length){
      await tx.restaurantRecipeItem.createMany({
        data:composition.recipeItems.map(item=>({
          productId:created.id,
          ...item
        }))
      });
    }

    return created;
  });

  revalidateMenu();
  revalidatePath("/admin/restaurante/insumos");
  revalidatePath("/admin/restaurante/adicionais");
  redirect("/admin/restaurante/cardapio/"+product.id);
}

export async function updateMenuProduct(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Produto inválido.");

  const data=menuProductData(formData);
  const composition=await readProductComposition(formData);

  await prisma.$transaction(async tx=>{
    await tx.restaurantProduct.update({where:{id},data});

    await tx.restaurantProductModifierGroup.deleteMany({where:{productId:id}});
    if(composition.groupIds.length){
      await tx.restaurantProductModifierGroup.createMany({
        data:composition.groupIds.map(groupId=>({
          productId:id,
          groupId
        })),
        skipDuplicates:true
      });
    }

    await tx.restaurantRecipeItem.deleteMany({where:{productId:id}});
    if(composition.recipeItems.length){
      await tx.restaurantRecipeItem.createMany({
        data:composition.recipeItems.map(item=>({
          productId:id,
          ...item
        }))
      });
    }
  });

  revalidateMenu();
  revalidatePath("/admin/restaurante/cardapio/"+id);
  revalidatePath("/admin/restaurante/insumos");
  revalidatePath("/admin/restaurante/adicionais");
}

export async function duplicateMenuProduct(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const product=await prisma.restaurantProduct.findUnique({
    where:{id},
    include:{modifierLinks:true,recipes:true}
  });
  if(!product)throw new Error("Produto não encontrado.");

  const copy=await prisma.restaurantProduct.create({
    data:{
      categoryId:product.categoryId,
      name:product.name+" — cópia",
      description:product.description,
      imageUrl:product.imageUrl,
      priceCents:product.priceCents,
      promotionalPriceCents:product.promotionalPriceCents,
      costCents:product.costCents,
      sku:null,
      active:false,
      featured:false,
      soldOut:false,
      badge:product.badge,
      tags:product.tags,
      allergens:product.allergens,
      sortOrder:product.sortOrder+1,
      prepMinutes:product.prepMinutes,
      maxPerOrder:product.maxPerOrder,
      allowNotes:product.allowNotes,
      availableFrom:product.availableFrom,
      availableUntil:product.availableUntil,
      availableDays:product.availableDays,
      trackStock:product.trackStock,
      stockQty:0,
      minStockQty:product.minStockQty
    }
  });

  await prisma.$transaction([
    prisma.restaurantProductModifierGroup.createMany({
      data:product.modifierLinks.map(link=>({productId:copy.id,groupId:link.groupId})),
      skipDuplicates:true
    }),
    prisma.restaurantRecipeItem.createMany({
      data:product.recipes.map(recipe=>({
        productId:copy.id,
        ingredientId:recipe.ingredientId,
        quantity:recipe.quantity
      })),
      skipDuplicates:true
    })
  ]);

  revalidateMenu();
  redirect("/admin/restaurante/cardapio/"+copy.id);
}

export async function toggleMenuProduct(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const field=String(formData.get("field")||"active");
  if(!["active","featured","soldOut"].includes(field))throw new Error("Ação inválida.");

  const product=await prisma.restaurantProduct.findUnique({where:{id}});
  if(!product)throw new Error("Produto não encontrado.");

  const current=field==="active"?product.active:field==="featured"?product.featured:product.soldOut;

  await prisma.restaurantProduct.update({
    where:{id},
    data:field==="active"
      ?{active:!current}
      :field==="featured"
        ?{featured:!current}
        :{soldOut:!current}
  });

  revalidateMenu();
}

export async function moveMenuProduct(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const direction=String(formData.get("direction")||"DOWN");
  await prisma.restaurantProduct.update({
    where:{id},
    data:{sortOrder:{increment:direction==="UP"?-10:10}}
  });
  revalidateMenu();
}

export async function deleteMenuProduct(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  if(!id)return;

  const orders=await prisma.restaurantOrderItem.count({where:{productId:id}});
  if(orders>0){
    await prisma.restaurantProduct.update({
      where:{id},
      data:{active:false,soldOut:true}
    });
  }else{
    await prisma.restaurantProduct.delete({where:{id}});
  }

  revalidateMenu();
}
