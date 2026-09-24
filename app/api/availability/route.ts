import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";
import {hasUnitCapacity} from "../../../lib/shared-inventory";
import {syncDueAccommodationChannels} from "../../../lib/channel-sync";

export const dynamic="force-dynamic";

function day(value:Date){
  return value.toISOString().slice(0,10);
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("accommodationId")||"";
  if(!id)return NextResponse.json({error:"accommodationId obrigatório"},{status:400});

  const guestsRaw=Number(req.nextUrl.searchParams.get("guests")||1);
  const requestedUnits=Number.isInteger(guestsRaw)&&guestsRaw>0?guestsRaw:1;

  const room=await prisma.accommodation.findFirst({
    where:{id,active:true},
    select:{id:true,sharedRoom:true,bedCount:true,capacity:true}
  });
  if(!room)return NextResponse.json({error:"Hospedagem inválida"},{status:404});

  const channelRefresh=await syncDueAccommodationChannels(id)
    .catch(()=>({channels:0,failures:1}));

  const from=new Date();
  from.setUTCHours(0,0,0,0);
  const to=new Date(from);
  to.setUTCMonth(to.getUTCMonth()+13);

  const [external,internal,holds,manual]=await Promise.all([
    prisma.channelBlock.findMany({
      where:{integration:{accommodationId:id,active:true},endsAt:{gt:from},startsAt:{lt:to}},
      select:{startsAt:true,endsAt:true}
    }),
    prisma.bookingLead.findMany({
      where:{
        accommodationId:id,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkOut:{gt:from},
        checkIn:{lt:to}
      },
      select:{checkIn:true,checkOut:true,guests:true}
    }),
    prisma.inventoryHold.findMany({
      where:{
        accommodationId:id,
        expiresAt:{gt:new Date()},
        checkOut:{gt:from},
        checkIn:{lt:to}
      },
      select:{checkIn:true,checkOut:true,units:true}
    }),
    prisma.manualInventoryBlock.findMany({
      where:{
        accommodationId:id,
        endsAt:{gt:from},
        startsAt:{lt:to}
      },
      select:{startsAt:true,endsAt:true}
    })
  ]);

  if(!room.sharedRoom){
    return NextResponse.json({
      sharedRoom:false,
      capacity:room.capacity,
      channelRefresh,
      blocks:[
        ...external.map(x=>({start:day(x.startsAt),end:day(x.endsAt),kind:"CHANNEL"})),
        ...internal
          .filter(x=>x.checkIn&&x.checkOut)
          .map(x=>({start:day(x.checkIn!),end:day(x.checkOut!),kind:"BOOKING"})),
        ...holds.map(x=>({start:day(x.checkIn),end:day(x.checkOut),kind:"HOLD"})),
        ...manual.map(x=>({start:day(x.startsAt),end:day(x.endsAt),kind:"MANUAL"}))
      ]
    },{headers:{"Cache-Control":"private, max-age=15"}});
  }

  const totalBeds=Math.max(0,room.bedCount);
  const softIntervals=[
    ...internal
      .filter(x=>x.checkIn&&x.checkOut)
      .map(x=>({start:x.checkIn!,end:x.checkOut!,units:Math.max(1,x.guests)})),
    ...holds.map(x=>({start:x.checkIn,end:x.checkOut,units:Math.max(1,x.units)}))
  ];
  const hardIntervals=[
    ...external.map(x=>({start:x.startsAt,end:x.endsAt})),
    ...manual.map(x=>({start:x.startsAt,end:x.endsAt}))
  ];

  const blockedDays:string[]=[];
  const cursor=new Date(from);

  while(cursor<to){
    const probe=new Date(cursor);
    probe.setUTCHours(12,0,0,0);
    const probeEnd=new Date(probe.getTime()+1);

    const hardBlocked=hardIntervals.some(interval=>
      interval.start<=probe&&interval.end>probe
    );

    const hasBeds=!hardBlocked&&hasUnitCapacity(
      totalBeds,
      requestedUnits,
      softIntervals,
      probe,
      probeEnd
    );

    if(!hasBeds)blockedDays.push(day(cursor));
    cursor.setUTCDate(cursor.getUTCDate()+1);
  }

  const blocks:{start:string;end:string;kind:string}[]=[];
  for(const date of blockedDays){
    const current=new Date(date+"T00:00:00Z");
    const next=new Date(current);
    next.setUTCDate(next.getUTCDate()+1);
    const last=blocks.at(-1);

    if(last&&last.end===date){
      last.end=day(next);
    }else{
      blocks.push({start:date,end:day(next),kind:"CAPACITY"});
    }
  }

  return NextResponse.json({
    sharedRoom:true,
    totalBeds,
    requestedBeds:requestedUnits,
    channelRefresh,
    blocks
  },{headers:{"Cache-Control":"private, max-age=15"}});
}
