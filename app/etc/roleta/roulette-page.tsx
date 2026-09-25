import {prisma} from "../../../lib/prisma";
import RouletteGame from "./roulette-game";
import styles from "./roleta.module.css";

function endDay(date:Date){return new Date(date.getTime()+24*60*60_000)}
type ReviewLink={key:string;label:string;url:string};

function parseLinks(raw:unknown,fallbackUrl:string|null,fallbackLabel:string){
  const links:ReviewLink[]=[];
  if(Array.isArray(raw)){
    for(const item of raw){
      if(item&&typeof item==="object"&&!Array.isArray(item)){
        const row=item as Record<string,unknown>;
        const url=String(row.url||"").trim();
        const label=String(row.label||"").trim();
        const key=String(row.key||"").trim();
        if(url&&label&&key)links.push({key,label,url});
      }
    }
  }
  if(!links.length&&fallbackUrl)links.push({key:"GOOGLE",label:fallbackLabel,url:fallbackUrl});
  return links;
}

export default async function RoulettePage({settingsId,preview=false}:{settingsId:"main"|"delivery";preview?:boolean}){
  const now=new Date();
  const settings=await prisma.rouletteSettings.findUnique({where:{id:settingsId}});
  if(!settings)return <main className={styles.shell}><section className={styles.card}><header className={styles.header}><span>MORIAH • EXPERIÊNCIA</span><h1>Roleta Moriah</h1><p>A campanha está sendo preparada. Volte em breve.</p></header></section></main>;

  const prizes=await prisma.roulettePrize.findMany({
    where:{active:true,campaignKey:settings.campaignKey},
    orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]
  });
  let available=prizes.filter(prize=>prize.quantityTotal===null||prize.awardedCount<prize.quantityTotal);
  if(preview&&!available.length){
    available=(settingsId==="delivery"?[
      {id:"preview-d1",campaignKey:settings.campaignKey,name:"10% OFF",description:"Prêmio demonstrativo.",color:"#FFD400",textColor:"#101010",weight:3,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:10,createdAt:now,updatedAt:now},
      {id:"preview-d2",campaignKey:settings.campaignKey,name:"Frete grátis",description:"Prêmio demonstrativo.",color:"#101010",textColor:"#FFFFFF",weight:2,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:20,createdAt:now,updatedAt:now},
      {id:"preview-d3",campaignKey:settings.campaignKey,name:"Refrigerante grátis",description:"Prêmio demonstrativo.",color:"#FFFFFF",textColor:"#101010",weight:2,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:30,createdAt:now,updatedAt:now}
    ]:[
      {id:"preview-m1",campaignKey:settings.campaignKey,name:"5% OFF",description:"Prêmio demonstrativo.",color:"#FFD400",textColor:"#101010",weight:3,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:10,createdAt:now,updatedAt:now},
      {id:"preview-m2",campaignKey:settings.campaignKey,name:"Sobremesa grátis",description:"Prêmio demonstrativo.",color:"#101010",textColor:"#FFFFFF",weight:2,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:20,createdAt:now,updatedAt:now},
      {id:"preview-m3",campaignKey:settings.campaignKey,name:"10% OFF",description:"Prêmio demonstrativo.",color:"#FFFFFF",textColor:"#101010",weight:2,quantityTotal:null,awardedCount:0,validityDays:14,active:true,sortOrder:30,createdAt:now,updatedAt:now}
    ] as typeof prizes;
  }
  const open=Boolean(preview||(settings.active&&(!settings.activeFrom||settings.activeFrom<=now)&&(!settings.activeUntil||settings.activeUntil>now)&&available.length));
  if(!open)return <main className={styles.shell}><section className={styles.card}><header className={styles.header}><span>MORIAH • EXPERIÊNCIA</span><h1>{settings.title}</h1><p>A campanha está sendo preparada ou está temporariamente indisponível.</p></header></section></main>;

  let event:null|Awaited<ReturnType<typeof prisma.moriahEvent.findFirst>>=null;
  if(settingsId==="main"&&settings.themeMode==="AUTO_EVENT"){
    try{
      const candidates=await prisma.moriahEvent.findMany({
        where:{published:true,rouletteThemeEnabled:true},
        orderBy:[{featured:"desc"},{startsAt:"desc"}],
        take:30
      });
      event=candidates.find(item=>{
        const start=item.rouletteThemeStartsAt||item.startsAt;
        const end=item.rouletteThemeEndsAt||item.endsAt||endDay(item.startsAt);
        return start<=now&&end>=now;
      })||null;
    }catch(error){console.error("ROULETTE_EVENT_THEME_LOAD_FAILED",error)}
  }

  const theme={
    preset:event?.themePreset||settings.themePreset,
    primary:event?.themePrimaryColor||settings.themePrimaryColor,
    secondary:event?.themeSecondaryColor||settings.themeSecondaryColor,
    accent:event?.themeAccentColor||settings.themeAccentColor,
    surface:settings.themeSurfaceColor,
    text:event?.themeTextColor||settings.themeTextColor,
    background:event?.themeBackgroundColor||settings.themeSecondaryColor,
    backgroundImage:event?.rouletteBackgroundImage||event?.coverImage||settings.themeBackgroundImageUrl,
    animationStyle:settings.animationStyle,
    event:event&&settings.showEventBanner?{
      title:event.title,badge:event.badge,slug:event.slug,startsAt:event.startsAt.toISOString()
    }:null
  };

  return <RouletteGame
    settingsId={settingsId}
    variant={settingsId==="delivery"?"delivery":"main"}
    settings={{
      title:settings.title,
      subtitle:settings.subtitle,
      introText:settings.introText,
      reviewLinks:parseLinks(settings.reviewLinks,settings.googleReviewUrl,settings.googleReviewLabel),
      termsText:settings.termsText
    }}
    theme={theme}
    preview={preview}
    initialPrizes={available.map(prize=>({
      id:prize.id,name:prize.name,description:prize.description,color:prize.color,
      textColor:prize.textColor,weight:Math.max(1,prize.weight)
    }))}
  />;
}
