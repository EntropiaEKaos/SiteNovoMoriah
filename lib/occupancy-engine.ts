import {prisma} from "./prisma";

function nights(start:Date,end:Date){
  return Math.max(1,Math.ceil((end.getTime()-start.getTime())/86400000));
}

export async function getOccupancyMetrics(start:Date,end:Date){
  if(!(start<end))throw new Error("Período inválido.");

  const rooms=await prisma.accommodation.findMany({
    where:{active:true},
    select:{id:true,sharedRoom:true,bedCount:true}
  });

  if(!rooms.length){
    return {
      occupancyPct:0,
      occupiedRoomNights:0,
      availableRoomNights:0,
      rooms:0,
      inventoryUnits:0
    };
  }

  const roomMap=new Map(rooms.map(room=>[
    room.id,
    room.sharedRoom?Math.max(1,room.bedCount):1
  ]));

  const totalNights=nights(start,end);
  const inventoryUnits=[...roomMap.values()].reduce((sum,value)=>sum+value,0);
  const availableRoomNights=inventoryUnits*totalNights;

  const [bookings,blocks,manual]=await Promise.all([
    prisma.bookingLead.findMany({
      where:{
        status:{in:["CONFIRMED","CHECKED_IN"]},
        accommodationId:{in:rooms.map(room=>room.id)},
        checkIn:{lt:end},
        checkOut:{gt:start}
      },
      select:{accommodationId:true,checkIn:true,checkOut:true,guests:true}
    }),
    prisma.channelBlock.findMany({
      where:{
        startsAt:{lt:end},
        endsAt:{gt:start},
        integration:{
          active:true,
          accommodationId:{in:rooms.map(room=>room.id)}
        }
      },
      select:{
        startsAt:true,
        endsAt:true,
        integration:{select:{accommodationId:true}}
      }
    }),
    prisma.manualInventoryBlock.findMany({
      where:{
        accommodationId:{in:rooms.map(room=>room.id)},
        startsAt:{lt:end},
        endsAt:{gt:start}
      },
      select:{accommodationId:true,startsAt:true,endsAt:true}
    })
  ]);

  const occupied=new Map<string,number>();

  const mark=(roomId:string|null,s:Date,e:Date,units:number)=>{
    if(!roomId)return;
    const capacity=roomMap.get(roomId)||1;
    const from=new Date(Math.max(start.getTime(),s.getTime()));
    const to=new Date(Math.min(end.getTime(),e.getTime()));

    for(let d=new Date(from);d<to;d.setUTCDate(d.getUTCDate()+1)){
      const key=roomId+":"+d.toISOString().slice(0,10);
      occupied.set(
        key,
        Math.min(capacity,(occupied.get(key)||0)+Math.max(1,units))
      );
    }
  };

  bookings.forEach(booking=>{
    if(!booking.checkIn||!booking.checkOut)return;
    const capacity=booking.accommodationId
      ?roomMap.get(booking.accommodationId)||1
      :1;
    mark(
      booking.accommodationId,
      booking.checkIn,
      booking.checkOut,
      capacity>1?booking.guests:1
    );
  });

  blocks.forEach(block=>{
    const roomId=block.integration.accommodationId;
    mark(roomId,block.startsAt,block.endsAt,roomId?roomMap.get(roomId)||1:1);
  });

  manual.forEach(block=>{
    mark(block.accommodationId,block.startsAt,block.endsAt,roomMap.get(block.accommodationId)||1);
  });

  const occupiedRoomNights=[...occupied.values()].reduce((sum,value)=>sum+value,0);

  return {
    occupancyPct:availableRoomNights
      ?Math.round(occupiedRoomNights*100/availableRoomNights)
      :0,
    occupiedRoomNights,
    availableRoomNights,
    rooms:rooms.length,
    inventoryUnits
  };
}
