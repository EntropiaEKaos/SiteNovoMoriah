import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import AvailabilityWidget from "./availability-widget";

export const dynamic="force-dynamic";

const DAY=86400000;
const dayKey=(date:Date)=>date.toISOString().slice(0,10);

export default async function Page({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const settings=await prisma.calendarWidgetSettings.findUnique({where:{publicToken:token}});
  if(!settings?.active)notFound();

  const now=new Date();
  const from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const to=new Date(from.getTime()+60*DAY);

  const rooms=await prisma.accommodation.findMany({
    where:{active:true},
    include:{
      bookingLeads:{
        where:{status:{in:["CONFIRMED","CHECKED_IN"]},checkIn:{lt:to},checkOut:{gt:from}},
        select:{checkIn:true,checkOut:true}
      },
      manualBlocks:{where:{startsAt:{lt:to},endsAt:{gt:from}},select:{startsAt:true,endsAt:true}},
      channelIntegrations:{
        where:{active:true},
        include:{blocks:{where:{startsAt:{lt:to},endsAt:{gt:from}},select:{startsAt:true,endsAt:true}}}
      },
      inventoryHolds:{where:{expiresAt:{gt:now},checkIn:{lt:to},checkOut:{gt:from}},select:{checkIn:true,checkOut:true}}
    },
    orderBy:[{featured:"desc"},{roomNumber:"asc"},{name:"asc"}]
  });

  const serialized=rooms.map(room=>{
    const blocked=new Set<string>();
    const ranges=[
      ...room.bookingLeads.filter(row=>row.checkIn&&row.checkOut).map(row=>[row.checkIn!,row.checkOut!] as const),
      ...room.manualBlocks.map(row=>[row.startsAt,row.endsAt] as const),
      ...room.channelIntegrations.flatMap(integration=>integration.blocks.map(row=>[row.startsAt,row.endsAt] as const)),
      ...room.inventoryHolds.map(row=>[row.checkIn,row.checkOut] as const)
    ];
    for(const [start,end] of ranges){
      let cursor=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()));
      while(cursor<end){
        blocked.add(dayKey(cursor));
        cursor=new Date(cursor.getTime()+DAY);
      }
    }
    return {
      id:room.id,
      name:room.name,
      roomNumber:room.roomNumber,
      priceCents:room.priceCents,
      capacity:room.capacity,
      coverImage:room.coverImage,
      blocked:[...blocked]
    };
  });

  return <AvailabilityWidget
    rooms={serialized}
    title={settings.title}
    subtitle={settings.subtitle}
    primaryColor={settings.primaryColor}
    accentColor={settings.accentColor}
    showPrices={settings.showPrices}
    allowBooking={settings.allowBooking}
    compact={settings.compact}
  />;
}
