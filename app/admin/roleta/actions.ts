"use server";

import {revalidatePath} from "next/cache";
import {Prisma} from "@prisma/client";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max);
}
function integer(formData:FormData,name:string,fallback:number,min:number,max:number){
  const raw=String(formData.get(name)||"").trim();
  const value=raw===""?fallback:Number(raw);
  if(!Number.isInteger(value)||value<min||value>max)throw new Error("Valor inválido em "+name+".");
  return value;
}
function nullableInteger(formData:FormData,name:string,min:number,max:number){
  const raw=String(formData.get(name)||"").trim();
  if(!raw)return null;
  const value=Number(raw);
  if(!Number.isInteger(value)||value<min||value>max)throw new Error("Valor inválido em "+name+".");
  return value;
}
function color(formData:FormData,name:string,fallback:string){
  const value=text(formData,name,7);
  return /^#[0-9a-f]{6}$/i.test(value)?value.toUpperCase():fallback;
}
function dateTime(formData:FormData,name:string){
  const value=text(formData,name,40);
  if(!value)return null;
  const normalized=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)?value+":00-03:00":value;
  const date=new Date(normalized);
  if(Number.isNaN(date.getTime()))throw new Error("Data inválida.");
  return date;
}
function httpsUrl(value:string){
  if(!value)return "";
  const url=new URL(value);
  if(url.protocol!=="https:")throw new Error("Use uma URL HTTPS.");
  return url.toString();
}
function campaignId(formData:FormData){
  const id=text(formData,"settingsId",40)||"main";
  if(!["main","delivery"].includes(id))throw new Error("Campanha inválida.");
  return id;
}
function reviewLinks(formData:FormData):Prisma.InputJsonValue{
  const links=[
    ["GOOGLE","Google","googleReviewUrl"],
    ["IFOOD","iFood","ifoodReviewUrl"],
    ["99FOOD","99Food","food99ReviewUrl"],
    ["KEETA","Keeta","keetaReviewUrl"]
  ].map(([key,label,field])=>({
    key,
    label:"Avaliar no "+label,
    url:httpsUrl(text(formData,field,500))
  })).filter(item=>item.url);
  return links as Prisma.InputJsonValue;
}
function revalidateRoulette(){
  revalidatePath("/admin/roleta");
  revalidatePath("/etc/roleta");
  revalidatePath("/etc/roleta/entregas");
}
async function audit(userId:string,action:string,targetId:string|null,details:Prisma.InputJsonObject){
  await prisma.adminAuditLog.create({data:{
    actorId:userId,
    action,
    targetType:"ROULETTE",
    targetId,
    details
  }});
}

export async function saveRouletteSettings(formData:FormData){
  const session=await requireAdmin();
  const id=campaignId(formData);
  const campaignKey=text(formData,"campaignKey",80).toLowerCase();
  if(!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(campaignKey))throw new Error("Identificador de campanha inválido.");
  const activeFrom=dateTime(formData,"activeFrom");
  const activeUntil=dateTime(formData,"activeUntil");
  if(activeFrom&&activeUntil&&activeFrom>=activeUntil)throw new Error("O fim da campanha deve ser posterior ao início.");

  const data={
    active:formData.get("active")==="on",
    campaignKey,
    title:text(formData,"title",120)||"Roleta da Sorte Moriah",
    subtitle:text(formData,"subtitle",240)||"Cadastre-se e descubra seu prêmio.",
    introText:text(formData,"introText",1200)||"Sua participação é independente de avaliações.",
    googleReviewUrl:id==="main"?(httpsUrl(text(formData,"googleReviewUrl",500))||null):null,
    googleReviewLabel:text(formData,"googleReviewLabel",100)||"Avaliar a Moriah",
    reviewLinks:reviewLinks(formData),
    termsText:text(formData,"termsText",1600)||"Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.",
    activeFrom,
    activeUntil,
    themeMode:["AUTO_EVENT","CUSTOM"].includes(text(formData,"themeMode",30))?text(formData,"themeMode",30):"CUSTOM",
    themePreset:text(formData,"themePreset",40)||"CELEBRATION",
    themePrimaryColor:color(formData,"themePrimaryColor","#0B607A"),
    themeSecondaryColor:color(formData,"themeSecondaryColor","#073B4C"),
    themeAccentColor:color(formData,"themeAccentColor","#FFC845"),
    themeSurfaceColor:color(formData,"themeSurfaceColor","#FFFFFF"),
    themeTextColor:color(formData,"themeTextColor","#16333D"),
    themeBackgroundImageUrl:text(formData,"themeBackgroundImageUrl",1000)||null,
    animationStyle:["CONFETTI","SPARKLES","BUBBLES","SNOW","NONE"].includes(text(formData,"animationStyle",30))?text(formData,"animationStyle",30):"CONFETTI",
    showEventBanner:formData.get("showEventBanner")==="on"
  };

  await prisma.rouletteSettings.upsert({where:{id},create:{id,...data},update:data});
  await audit(session.userId,"ROULETTE_SETTINGS_UPDATED",id,{campaignKey,active:data.active,themeMode:data.themeMode,themePreset:data.themePreset});
  revalidateRoulette();
}

export async function createRoulettePrize(formData:FormData){
  const session=await requireAdmin();
  const settingsId=campaignId(formData);
  const settings=await prisma.rouletteSettings.findUnique({where:{id:settingsId}});
  if(!settings)throw new Error("Campanha não encontrada.");
  const name=text(formData,"name",100);
  if(!name)throw new Error("Nome do prêmio é obrigatório.");
  const quantityTotal=nullableInteger(formData,"quantityTotal",1,1_000_000);
  const data={
    campaignKey:settings.campaignKey,
    name,
    description:text(formData,"description",500)||null,
    color:color(formData,"color","#FFC845"),
    textColor:color(formData,"textColor","#1B252B"),
    weight:integer(formData,"weight",1,1,10_000),
    quantityTotal,
    validityDays:nullableInteger(formData,"validityDays",1,365),
    active:formData.get("active")==="on",
    sortOrder:integer(formData,"sortOrder",100,0,100_000)
  };
  const prize=await prisma.roulettePrize.create({data});
  await audit(session.userId,"ROULETTE_PRIZE_CREATED",prize.id,{campaignKey:settings.campaignKey,name,weight:data.weight,quantityTotal});
  revalidateRoulette();
}

export async function updateRoulettePrize(formData:FormData){
  const session=await requireAdmin();
  const id=text(formData,"id",80);
  const current=await prisma.roulettePrize.findUnique({where:{id}});
  if(!current)throw new Error("Prêmio não encontrado.");
  const name=text(formData,"name",100);
  if(!name)throw new Error("Nome do prêmio é obrigatório.");
  const quantityTotal=nullableInteger(formData,"quantityTotal",1,1_000_000);
  if(quantityTotal!==null&&quantityTotal<current.awardedCount)throw new Error("A quantidade total não pode ser menor que a quantidade já sorteada.");
  const data={
    name,
    description:text(formData,"description",500)||null,
    color:color(formData,"color",current.color),
    textColor:color(formData,"textColor",current.textColor),
    weight:integer(formData,"weight",current.weight,1,10_000),
    quantityTotal,
    validityDays:nullableInteger(formData,"validityDays",1,365),
    active:formData.get("active")==="on",
    sortOrder:integer(formData,"sortOrder",current.sortOrder,0,100_000)
  };
  await prisma.roulettePrize.update({where:{id},data});
  await audit(session.userId,"ROULETTE_PRIZE_UPDATED",id,{campaignKey:current.campaignKey,name,weight:data.weight,quantityTotal,active:data.active});
  revalidateRoulette();
}

export async function toggleRoulettePrize(formData:FormData){
  const session=await requireAdmin();
  const id=text(formData,"id",80);
  const current=await prisma.roulettePrize.findUnique({where:{id}});
  if(!current)throw new Error("Prêmio não encontrado.");
  await prisma.roulettePrize.update({where:{id},data:{active:!current.active}});
  await audit(session.userId,"ROULETTE_PRIZE_TOGGLED",id,{campaignKey:current.campaignKey,active:!current.active});
  revalidateRoulette();
}

export async function redeemRouletteSpin(formData:FormData){
  const session=await requireAdmin();
  const id=text(formData,"id",80);
  const spin=await prisma.rouletteSpin.findUnique({where:{id},include:{entry:true,prize:true}});
  if(!spin)throw new Error("Sorteio não encontrado.");
  if(spin.redeemedAt)return;
  if(spin.expiresAt&&spin.expiresAt<new Date())throw new Error("Este prêmio está expirado.");
  await prisma.rouletteSpin.update({where:{id},data:{redeemedAt:new Date(),redeemedBy:session.username}});
  await audit(session.userId,"ROULETTE_PRIZE_REDEEMED",id,{campaignKey:spin.entry.campaignKey,claimCode:spin.claimCode,prize:spin.prize.name,phone:spin.entry.phone});
  revalidateRoulette();
}
