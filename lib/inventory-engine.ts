import {prisma} from "./prisma";
import {hasUnitCapacity} from "./shared-inventory";

export type InventorySource="DIRECT"|"MANUAL"|"ICAL"|"BOOKING_API"|"AIRBNB_API"|"EXPEDIA_API"|"OTHER_API";
export type InventoryConflict={source:InventorySource;provider:string;reference:string|null;startsAt:Date;endsAt:Date};

function validRange(checkIn:Date,checkOut:Date){
  if(!(checkIn instanceof Date)||!(checkOut instanceof Date)||Number.isNaN(checkIn.getTime())||Number.isNaN(checkOut.getTime())||checkIn>=checkOut){
    throw new Error("Período de hospedagem inválido.");
  }
}

function sourceOf(type:string):InventorySource{
  return (["ICAL","BOOKING_API","AIRBNB_API","EXPEDIA_API","OTHER_API"].includes(type)?type:"ICAL") as InventorySource;
}

export async function getInventoryConflicts(
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  excludeBookingId?:string
):Promise<InventoryConflict[]>{
  validRange(checkIn,checkOut);
  const [external,internal,holds,manual]=await Promise.all([
    prisma.channelBlock.findMany({
      where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn},integration:{accommodationId,active:true}},
      select:{externalUid:true,startsAt:true,endsAt:true,integration:{select:{provider:true,integrationType:true}}}
    }),
    prisma.bookingLead.findMany({
      where:{
        id:excludeBookingId?{not:excludeBookingId}:undefined,
        accommodationId,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkIn:{lt:checkOut},
        checkOut:{gt:checkIn}
      },
      select:{id:true,checkIn:true,checkOut:true}
    }),
    prisma.inventoryHold.findMany({
      where:{accommodationId,expiresAt:{gt:new Date()},checkIn:{lt:checkOut},checkOut:{gt:checkIn}},
      select:{token:true,checkIn:true,checkOut:true}
    }),
    prisma.manualInventoryBlock.findMany({
      where:{accommodationId,startsAt:{lt:checkOut},endsAt:{gt:checkIn}},
      select:{id:true,startsAt:true,endsAt:true}
    })
  ]);

  return [
    ...external.map(row=>({
      source:sourceOf(row.integration.integrationType),
      provider:row.integration.provider,
      reference:row.externalUid,
      startsAt:row.startsAt,
      endsAt:row.endsAt
    })),
    ...internal.filter(row=>row.checkIn&&row.checkOut).map(row=>({
      source:"DIRECT" as const,
      provider:"MORIAH",
      reference:row.id,
      startsAt:row.checkIn!,
      endsAt:row.checkOut!
    })),
    ...holds.map(row=>({
      source:"DIRECT" as const,
      provider:"MORIAH_HOLD",
      reference:row.token,
      startsAt:row.checkIn,
      endsAt:row.checkOut
    })),
    ...manual.map(row=>({
      source:"MANUAL" as const,
      provider:"MORIAH_MANUAL",
      reference:row.id,
      startsAt:row.startsAt,
      endsAt:row.endsAt
    }))
  ];
}

export async function isAccommodationAvailable(
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  excludeBookingId?:string,
  requestedUnits=1
){
  validRange(checkIn,checkOut);

  const room=await prisma.accommodation.findFirst({
    where:{id:accommodationId,active:true},
    select:{sharedRoom:true,bedCount:true,capacity:true}
  });
  if(!room)return false;

  if(!room.sharedRoom){
    if(requestedUnits>room.capacity)return false;
    return (await getInventoryConflicts(accommodationId,checkIn,checkOut,excludeBookingId)).length===0;
  }

  const beds=Math.max(0,room.bedCount);
  if(beds<1||requestedUnits<1||requestedUnits>beds)return false;

  const [hardBlocks,bookings,holds]=await Promise.all([
    Promise.all([
      prisma.channelBlock.count({
        where:{
          startsAt:{lt:checkOut},
          endsAt:{gt:checkIn},
          integration:{accommodationId,active:true}
        }
      }),
      prisma.manualInventoryBlock.count({
        where:{accommodationId,startsAt:{lt:checkOut},endsAt:{gt:checkIn}}
      })
    ]),
    prisma.bookingLead.findMany({
      where:{
        id:excludeBookingId?{not:excludeBookingId}:undefined,
        accommodationId,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkIn:{lt:checkOut},
        checkOut:{gt:checkIn}
      },
      select:{checkIn:true,checkOut:true,guests:true}
    }),
    prisma.inventoryHold.findMany({
      where:{
        accommodationId,
        expiresAt:{gt:new Date()},
        checkIn:{lt:checkOut},
        checkOut:{gt:checkIn}
      },
      select:{checkIn:true,checkOut:true,units:true}
    })
  ]);

  if(hardBlocks[0]>0||hardBlocks[1]>0)return false;

  const intervals=[
    ...bookings
      .filter(row=>row.checkIn&&row.checkOut)
      .map(row=>({start:row.checkIn!,end:row.checkOut!,units:Math.max(1,row.guests)})),
    ...holds.map(row=>({start:row.checkIn,end:row.checkOut,units:Math.max(1,row.units)}))
  ];

  return hasUnitCapacity(beds,requestedUnits,intervals,checkIn,checkOut);
}

export async function getAvailableAccommodations(checkIn:Date,checkOut:Date,guests=1){
  validRange(checkIn,checkOut);
  const units=Math.max(1,Math.floor(guests||1));

  const rooms=await prisma.accommodation.findMany({
    where:{
      active:true,
      OR:[
        {sharedRoom:false,capacity:{gte:units}},
        {sharedRoom:true,bedCount:{gte:units}}
      ]
    },
    orderBy:[{featured:"desc"},{name:"asc"}]
  });
  if(!rooms.length)return [];

  const checks=await Promise.all(
    rooms.map(async room=>({
      room,
      available:await isAccommodationAvailable(room.id,checkIn,checkOut,undefined,units)
    }))
  );

  return checks.filter(item=>item.available).map(item=>item.room);
}
