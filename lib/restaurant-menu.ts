export type MenuSchedule={
  availableFrom:string|null;
  availableUntil:string|null;
  availableDays:number[];
};

export function saoPauloClock(now=new Date()){
  const formatter=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Sao_Paulo",
    weekday:"short",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  });
  const parts=formatter.formatToParts(now);
  const weekday=parts.find(part=>part.type==="weekday")?.value||"Sun";
  const hour=parts.find(part=>part.type==="hour")?.value||"00";
  const minute=parts.find(part=>part.type==="minute")?.value||"00";
  const dayMap:Record<string,number>={
    Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6
  };
  return {
    day:dayMap[weekday]??0,
    time:hour+":"+minute
  };
}

export function isMenuScheduleAvailable(
  schedule:MenuSchedule,
  now=new Date()
){
  const {day,time}=saoPauloClock(now);

  if(schedule.availableDays.length>0&&!schedule.availableDays.includes(day)){
    return false;
  }

  const from=schedule.availableFrom;
  const until=schedule.availableUntil;
  if(!from&&!until)return true;
  if(from&&!until)return time>=from;
  if(!from&&until)return time<until;

  if(from!&&until!){
    return from<=until
      ?time>=from&&time<until
      :time>=from||time<until;
  }

  return true;
}

export function effectiveRestaurantPrice(product:{
  priceCents:number;
  promotionalPriceCents:number|null;
}){
  return product.promotionalPriceCents!=null&&
    product.promotionalPriceCents>=0&&
    product.promotionalPriceCents<product.priceCents
      ?product.promotionalPriceCents
      :product.priceCents;
}

export function restaurantProductAvailable(product:{
  active:boolean;
  soldOut:boolean;
  trackStock:boolean;
  stockQty:number;
  availableFrom:string|null;
  availableUntil:string|null;
  availableDays:number[];
  recipes:Array<{
    quantity:number;
    ingredient:{stockQty:number;active:boolean};
  }>;
},now=new Date()){
  if(!product.active||product.soldOut)return false;
  if(!isMenuScheduleAvailable(product,now))return false;
  if(product.trackStock&&product.stockQty<=0)return false;
  if(product.recipes.some(recipe=>
    !recipe.ingredient.active||
    recipe.ingredient.stockQty<recipe.quantity
  ))return false;
  return true;
}
