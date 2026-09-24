"use client";

import {useMemo,useState} from "react";

type Room={
  id:string;
  name:string;
  roomNumber:string|null;
  priceCents:number|null;
  capacity:number;
  coverImage:string|null;
  blocked:string[];
};

const DAY=86400000;
const key=(date:Date)=>date.toISOString().slice(0,10);
const todayUtc=()=>{
  const now=new Date();
  return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
};

export default function AvailabilityWidget({
  rooms,
  title,
  subtitle,
  primaryColor,
  accentColor,
  showPrices,
  allowBooking,
  compact
}:{
  rooms:Room[];
  title:string;
  subtitle:string|null;
  primaryColor:string;
  accentColor:string;
  showPrices:boolean;
  allowBooking:boolean;
  compact:boolean;
}){
  const today=useMemo(()=>todayUtc(),[]);
  const [roomId,setRoomId]=useState(rooms[0]?.id||"");
  const [start,setStart]=useState<string|null>(null);
  const [end,setEnd]=useState<string|null>(null);
  const days=useMemo(()=>Array.from({length:compact?21:45},(_,i)=>new Date(today.getTime()+i*DAY)),[today,compact]);
  const room=rooms.find(item=>item.id===roomId)||rooms[0];

  function choose(day:string){
    if(!room||room.blocked.includes(day))return;
    if(!start||end||day<=start){setStart(day);setEnd(null);return;}
    const startDate=new Date(start+"T00:00:00Z");
    const endDate=new Date(day+"T00:00:00Z");
    for(let time=startDate.getTime();time<endDate.getTime();time+=DAY){
      if(room.blocked.includes(key(new Date(time)))){setStart(day);setEnd(null);return;}
    }
    setEnd(day);
  }

  const href=room&&start&&end
    ?"/reservar?accommodationId="+encodeURIComponent(room.id)+"&checkIn="+start+"&checkOut="+end
    :null;

  return <main className="externalCalendarWidget" style={{"--widget-primary":primaryColor,"--widget-accent":accentColor} as React.CSSProperties}>
    <header><small>RESERVAS / DISPONIBILIDADE</small><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</header>
    <div className="externalWidgetRooms">
      {rooms.map(item=><button type="button" key={item.id} className={item.id===room?.id?"isActive":""} onClick={()=>{setRoomId(item.id);setStart(null);setEnd(null);}}>
        <span>{item.coverImage?<img src={item.coverImage} alt=""/>:<i/>}</span>
        <div><b>{item.name}</b><small>até {item.capacity} hóspede(s){showPrices&&item.priceCents!=null?" • a partir de "+(item.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):""}</small></div>
      </button>)}
    </div>
    {room&&<section className="externalWidgetCalendar">
      <div className="externalWidgetCalendarHead"><div><small>HOSPEDAGEM</small><h2>{room.roomNumber?room.roomNumber+" • ":""}{room.name}</h2></div><span>{start?end?start+" → "+end:"Escolha a saída":"Escolha a entrada"}</span></div>
      <div className="externalWidgetDays">
        {days.map(day=>{
          const d=key(day);
          const blocked=room.blocked.includes(d);
          const selected=d===start||d===end||(start&&end&&d>start&&d<end);
          return <button type="button" key={d} disabled={blocked} className={(blocked?"isBlocked ":"")+(selected?"isSelected ":"")} onClick={()=>choose(d)}>
            <small>{day.toLocaleDateString("pt-BR",{weekday:"short",timeZone:"UTC"}).replace(".","")}</small>
            <b>{day.getUTCDate()}</b>
            <span>{blocked?"ocupado":"livre"}</span>
          </button>;
        })}
      </div>
    </section>}
    <footer>
      <div><b>{start&&end?"Período selecionado":"Selecione entrada e saída"}</b><span>{start&&end?start+" → "+end:"Datas ocupadas ficam bloqueadas automaticamente."}</span></div>
      {allowBooking&&href?<a href={href} target="_top">Reservar agora →</a>:<button disabled>Reservar agora</button>}
    </footer>
  </main>;
}
