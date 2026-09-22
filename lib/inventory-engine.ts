import {prisma} from "./prisma";

export type InventorySource="DIRECT"|"ICAL"|"BOOKING_API"|"AIRBNB_API"|"EXPEDIA_API"|"OTHER_API";
export type InventoryConflict={source:InventorySource;provider:string;reference:string|null;startsAt:Date;endsAt:Date};

export async function getInventoryConflicts(accommodationId:string,checkIn:Date,checkOut:Date):Promise<InventoryConflict[]>{
 if(!(checkIn instanceof Date)||!(checkOut instanceof Date)||Number.isNaN(checkIn.getTime())||Number.isNaN(checkOut.getTime())||checkIn>=checkOut)throw new Error("Período de hospedagem inválido.");
 const [external,internal]=await Promise.all([
  prisma.channelBlock.findMany({where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn},integration:{accommodationId,active:true}},select:{externalUid:true,startsAt:true,endsAt:true,integration:{select:{provider:true}}}}),
  prisma.bookingLead.findMany({where:{accommodationId,status:"CONFIRMED",checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{id:true,checkIn:true,checkOut:true}})
 ]);
 return [
  ...external.map(row=>({source:"ICAL" as const,provider:row.integration.provider,reference:row.externalUid,startsAt:row.startsAt,endsAt:row.endsAt})),
  ...internal.filter(row=>row.checkIn&&row.checkOut).map(row=>({source:"DIRECT" as const,provider:"MORIAH",reference:row.id,startsAt:row.checkIn!,endsAt:row.checkOut!}))
 ];
}

export async function isAccommodationAvailable(accommodationId:string,checkIn:Date,checkOut:Date){
 return (await getInventoryConflicts(accommodationId,checkIn,checkOut)).length===0;
}

export async function getAvailableAccommodations(checkIn:Date,checkOut:Date,guests=1){
 const rooms=await prisma.accommodation.findMany({where:{active:true,capacity:{gte:Math.max(1,guests)}},orderBy:[{featured:"desc"},{name:"asc"}]});
 const checks=await Promise.all(rooms.map(async room=>({room,available:await isAccommodationAvailable(room.id,checkIn,checkOut)})));
 return checks.filter(item=>item.available).map(item=>item.room);
}
