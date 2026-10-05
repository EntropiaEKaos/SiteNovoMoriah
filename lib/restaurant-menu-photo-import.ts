"use server";

import {prisma} from "./prisma";
import {requireAdmin} from "./admin-auth";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

type SeedProduct={
  category:string;
  name:string;
  priceCents:number;
  description?:string;
  days?:number[];
  sortOrder?:number;
  modifierGroups?:string[];
};

type SeedModifier={
  name:string;
  required?:boolean;
  minSelect?:number;
  maxSelect?:number;
  options:Array<{name:string;priceCents?:number}>;
};

const categories=[
  {name:"Café da Manhã",sortOrder:10,description:"Café da manhã, bebidas e lanches rápidos."},
  {name:"Prato do Dia",sortOrder:20,description:"Sabor caseiro todos os dias da semana."},
  {name:"Pratos",sortOrder:30,description:"Pratos completos. Acompanham farofa, arroz, feijão, salada e refrigerante 269 ml conforme o cardápio."},
  {name:"Porções",sortOrder:40,description:"Porções e petiscos para compartilhar."},
  {name:"Panquecas",sortOrder:50,description:"Panquecas salgadas, doces e vegetarianas."}
] as const;

const modifiers:SeedModifier[]=[
  {name:"Sabores de suco natural",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Laranja"},{name:"Limão"},{name:"Abacaxi"},{name:"Morango"},{name:"Maracujá"}
  ]},
  {name:"Sabores de vitamina",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Banana"},{name:"Abacate"},{name:"Mamão"},{name:"Mista"}
  ]},
  {name:"Adicionais para vitamina",maxSelect:3,options:[
    {name:"Aveia",priceCents:300},{name:"Cereais",priceCents:300},{name:"Leite em pó",priceCents:300}
  ]},
  {name:"Recheio da tapioca",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Carne seca"},{name:"Manteiga nordeste"},{name:"Ovos mexidos"}
  ]},
  {name:"Bebida 269 ml",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Coca-Cola 269 ml"},{name:"Guaraná Antarctica 269 ml"}
  ]},
  {name:"Sabores de pastel",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Frango catupiry"},{name:"3 queijos"},{name:"Queijo"},{name:"Carne"},{name:"Palmito"},{name:"Alho"}
  ]},
  {name:"Sabores de caldo",required:true,minSelect:1,maxSelect:1,options:[
    {name:"Calabresa"},{name:"Frango"},{name:"Carne"},{name:"Caldo verde"},{name:"Caldo de moqueca"},{name:"Legumes"}
  ]}
];

const products:SeedProduct[]=[
  {category:"Café da Manhã",name:"Pão com manteiga",priceCents:700},
  {category:"Café da Manhã",name:"Pão na chapa",priceCents:900},
  {category:"Café da Manhã",name:"Misto frio",priceCents:1100},
  {category:"Café da Manhã",name:"Misto quente",priceCents:1200},
  {category:"Café da Manhã",name:"Ovos mexidos",priceCents:1300},
  {category:"Café da Manhã",name:"Tapioca",priceCents:1500,description:"Escolha entre carne seca, manteiga nordeste ou ovos mexidos.",modifierGroups:["Recheio da tapioca"]},
  {category:"Café da Manhã",name:"Suco natural 500 ml",priceCents:1000,modifierGroups:["Sabores de suco natural"]},
  {category:"Café da Manhã",name:"Vitamina 500 ml",priceCents:1700,modifierGroups:["Sabores de vitamina","Adicionais para vitamina"]},
  {category:"Café da Manhã",name:"Café Moriah torrado",priceCents:700},
  {category:"Café da Manhã",name:"Achocolatado",priceCents:900},
  {category:"Café da Manhã",name:"Leite",priceCents:500},
  {category:"Café da Manhã",name:"Capuccino Moriah",priceCents:1000},

  {category:"Prato do Dia",name:"Carne de panela",priceCents:3200,days:[1],description:"Prato de segunda-feira. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Virado à paulista",priceCents:2800,days:[2],description:"Prato de terça-feira. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Feijoada",priceCents:3500,days:[3],description:"Prato de quarta-feira. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Parmegiana de carne",priceCents:3800,days:[4],description:"Prato de quinta-feira. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Costelinha suína",priceCents:3300,days:[5],description:"Prato de sexta-feira. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Moqueca de peixe",priceCents:3500,days:[6],description:"Prato de sábado. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},
  {category:"Prato do Dia",name:"Churrasco",priceCents:3400,days:[0],description:"Prato de domingo. Acompanha farofa, arroz, feijão, salada e refrigerante 269 ml.",modifierGroups:["Bebida 269 ml"]},

  {category:"Pratos",name:"Calabresa acebolada",priceCents:2800,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Bife acebolado",priceCents:3200,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Omelete recheado",priceCents:2300,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Frango grelhado com fritas",priceCents:2500,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Frango a passarinho",priceCents:2800,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Filé de peixe à milanesa",priceCents:3200,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Macarronada à bolonhesa",priceCents:2800,modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Panqueca",priceCents:5200,description:"Serve duas pessoas. Carne, queijo, frango ou catupiry. Adicionais conforme cardápio.",modifierGroups:["Bebida 269 ml"]},
  {category:"Pratos",name:"Prato Kids com fritas",priceCents:2200,description:"Calabresa, iscas de carne, carne moída ou nuggets.",modifierGroups:["Bebida 269 ml"]},

  {category:"Porções",name:"Isca de frango",priceCents:3800},
  {category:"Porções",name:"Contra filé acebolado",priceCents:4200},
  {category:"Porções",name:"Tilápia com anéis de cebola",priceCents:4500},
  {category:"Porções",name:"Anéis de cebola e cebola crispy",priceCents:3800},
  {category:"Porções",name:"Fritas recheadas",priceCents:3500},
  {category:"Porções",name:"Fritas simples",priceCents:2800},
  {category:"Porções",name:"Pastel",priceCents:1400,modifierGroups:["Sabores de pastel"]},
  {category:"Porções",name:"Pastel Big Monster Especial",priceCents:2200,description:"Todos os recheios."},
  {category:"Porções",name:"6 Mini Pastéis",priceCents:2400,description:"Carne, queijo ou frango."},
  {category:"Porções",name:"Caldos",priceCents:2600,modifierGroups:["Sabores de caldo"]},

  {category:"Panquecas",name:"Panqueca salgada de frango",priceCents:2400},
  {category:"Panquecas",name:"Panqueca salgada de carne",priceCents:2400},
  {category:"Panquecas",name:"Panqueca salgada de calabresa",priceCents:2400},
  {category:"Panquecas",name:"Panqueca salgada de presunto e queijo",priceCents:2300},
  {category:"Panquecas",name:"Panqueca salgada toscana com bacon",priceCents:2500},
  {category:"Panquecas",name:"Panqueca salgada costelinha",priceCents:2700},
  {category:"Panquecas",name:"Panqueca doce de doce de leite",priceCents:1800},
  {category:"Panquecas",name:"Panqueca doce de brigadeiro",priceCents:1800},
  {category:"Panquecas",name:"Panqueca doce de Nutella",priceCents:1800},
  {category:"Panquecas",name:"Panqueca doce de beijinho",priceCents:1800},
  {category:"Panquecas",name:"Panqueca doce Sonho de Valsa",priceCents:1900},
  {category:"Panquecas",name:"Panqueca doce de morango com leite condensado",priceCents:2000},
  {category:"Panquecas",name:"Panqueca doce de abacaxi com chocolate",priceCents:2000},
  {category:"Panquecas",name:"Panqueca doce de banana com canela",priceCents:1800},
  {category:"Panquecas",name:"Panqueca vegetariana de milho",priceCents:2200},
  {category:"Panquecas",name:"Panqueca vegetariana de espinafre",priceCents:2200},
  {category:"Panquecas",name:"Panqueca vegetariana de escarola",priceCents:2200},
  {category:"Panquecas",name:"Panqueca vegetariana de brócolis",priceCents:2200},
  {category:"Panquecas",name:"Panqueca vegetariana de alho frito",priceCents:2200}
];

export async function importPhotographedMoriahMenu(){
  await requireAdmin();

  const result=await prisma.$transaction(async tx=>{
    const categoryIds=new Map<string,string>();
    let categoriesCreated=0;
    let groupsCreated=0;
    let optionsCreated=0;
    let productsCreated=0;
    let productsSkipped=0;

    for(const seed of categories){
      let category=await tx.restaurantCategory.findFirst({where:{name:{equals:seed.name,mode:"insensitive"}}});
      if(!category){
        category=await tx.restaurantCategory.create({data:{
          name:seed.name,
          description:seed.description,
          sortOrder:seed.sortOrder,
          active:true,
          featured:false,
          availableDays:[]
        }});
        categoriesCreated++;
      }
      categoryIds.set(seed.name,category.id);
    }

    const groupIds=new Map<string,string>();
    for(const seed of modifiers){
      let group=await tx.restaurantModifierGroup.findFirst({where:{name:{equals:seed.name,mode:"insensitive"}}});
      if(!group){
        group=await tx.restaurantModifierGroup.create({data:{
          name:seed.name,
          required:seed.required??false,
          minSelect:seed.minSelect??0,
          maxSelect:seed.maxSelect??1,
          active:true
        }});
        groupsCreated++;
      }
      groupIds.set(seed.name,group.id);

      for(const option of seed.options){
        const exists=await tx.restaurantModifierOption.findFirst({
          where:{groupId:group.id,name:{equals:option.name,mode:"insensitive"}}
        });
        if(!exists){
          await tx.restaurantModifierOption.create({data:{
            groupId:group.id,
            name:option.name,
            priceCents:option.priceCents??0,
            active:true
          }});
          optionsCreated++;
        }
      }
    }

    for(const [index,seed] of products.entries()){
      const categoryId=categoryIds.get(seed.category);
      if(!categoryId)throw new Error("Categoria do lote não encontrada: "+seed.category);

      const exists=await tx.restaurantProduct.findFirst({
        where:{categoryId,name:{equals:seed.name,mode:"insensitive"}}
      });
      if(exists){
        productsSkipped++;
        continue;
      }

      const product=await tx.restaurantProduct.create({data:{
        categoryId,
        name:seed.name,
        description:seed.description??null,
        priceCents:seed.priceCents,
        active:true,
        featured:false,
        soldOut:false,
        tags:["cardápio fotografado"],
        sortOrder:seed.sortOrder??((index+1)*10),
        allowNotes:true,
        availableDays:seed.days??[],
        trackStock:false,
        stockQty:0,
        minStockQty:0
      }});

      if(seed.modifierGroups?.length){
        const links=seed.modifierGroups.map(name=>{
          const groupId=groupIds.get(name);
          if(!groupId)throw new Error("Grupo do lote não encontrado: "+name);
          return {productId:product.id,groupId};
        });
        await tx.restaurantProductModifierGroup.createMany({data:links,skipDuplicates:true});
      }
      productsCreated++;
    }

    return {categoriesCreated,groupsCreated,optionsCreated,productsCreated,productsSkipped,totalProducts:products.length};
  });

  revalidatePath("/admin/restaurante/cardapio");
  revalidatePath("/admin/restaurante/adicionais");
  revalidatePath("/restaurante");
  redirect("/admin/restaurante/cardapio?imported="+encodeURIComponent(JSON.stringify(result)));
}

export const photographedMoriahMenuSummary={
  categories:categories.length,
  products:products.length,
  modifierGroups:modifiers.length,
  modifierOptions:modifiers.reduce((sum,group)=>sum+group.options.length,0)
};
