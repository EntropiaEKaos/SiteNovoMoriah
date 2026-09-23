import {prisma} from "./prisma";
export type InventorySource="DIRECT"|"MANUAL"|"ICAL"|"BOOKING_API"|"AIRBNB_API"|"EXPEDIA_API"|"OTHER_API";
export type InventoryConflict={source:InventorySource;provider:string;reference:string|null;startsAt:Date;endsAt:Date};
function validRange(checkIn:Date,checkOut:Date){if(!(checkIn instanceof Date)||!(checkOut instanceof Date)||Number.isNaN(checkIn.getTime())||Number.isNaN(checkOut.getTime())||checkIn>=checkOut)throw new Error("Período de hospedagem inválido.");}
function sourceOf(type:string):InventorySource{return (["ICAL","BOOKING_API","AIRBNB_API","EXPEDIA_API","OTHER_API"].includes(type)?type:"ICAL") as InventorySource;}
export async function getInventoryConflicts(accommodationId:string,checkIn:Date,checkOut:Date,excludeBookingId?:string):Promise<InventoryConflict[]>{
 validRange(checkIn,checkOut);
 const [external,internal,holds,manual]=await Promise.all([
  prisma.channelBlock.findMany({where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn},integration:{accommodationId,active:true}},select:{externalUid:true,startsAt:true,endsAt:true,integration:{select:{provider:true,integrationType:true}}}}),
  prisma.bookingLead.findMany({where:{id:excludeBookingId?{not:excludeBookingId}:undefined,accommodationId,status:{in:["CONFIRMED","CHECKED_IN"]},checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{id:true,checkIn:true,checkOut:true}}),
  prisma.inventoryHold.findMany({where:{accommodationId,expiresAt:{gt:new Date()},checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{token:true,checkIn:true,checkOut:true}}),
  prisma.manualInventoryBlock.findMany({where:{accommodationId,startsAt:{lt:checkOut},endsAt:{gt:checkIn}},select:{id:true,startsAt:true,endsAt:true}})
 ]);
 return [
  ...external.map(row=>({source:sourceOf(row.integration.integrationType),provider:row.integration.provider,reference:row.externalUid,startsAt:row.startsAt,endsAt:row.endsAt})),
  ...internal.filter(row=>row.checkIn&&row.checkOut).map(row=>({source:"DIRECT" as const,provider:"MORIAH",reference:row.id,startsAt:row.checkIn!,endsAt:row.checkOut!})),
  ...holds.map(row=>({source:"DIRECT" as const,provider:"MORIAH_HOLD",reference:row.token,startsAt:row.checkIn,endsAt:row.checkOut})),
  ...manual.map(row=>({source:"MANUAL" as const,provider:"MORIAH_MANUAL",reference:row.id,startsAt:row.startsAt,endsAt:row.endsAt}))
 ];
}
export async function isAccommodationAvailable(accommodationId:string,checkIn:Date,checkOut:Date,excludeBookingId?:string){return (await getInventoryConflicts(accommodationId,checkIn,checkOut,excludeBookingId)).length===0;}
export async function getAvailableAccommodations(checkIn:Date,checkOut:Date,guests=1){
 validRange(checkIn,checkOut);
 const rooms=await prisma.accommodation.findMany({where:{active:true,capacity:{gte:Math.max(1,guests)}},orderBy:[{featured:"desc"},{name:"asc"}]});
 if(!rooms.length)return [];
 const ids=rooms.map(r=>r.id);
 const [external,internal,holds,manual]=await Promise.all([
  prisma.channelBlock.findMany({where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn},integration:{accommodationId:{in:ids},active:true}},select:{integration:{select:{accommodationId:true}}}}),
  prisma.bookingLead.findMany({where:{accommodationId:{in:ids},status:{in:["CONFIRMED","CHECKED_IN"]},checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{accommodationId:true}}),
  prisma.inventoryHold.findMany({where:{accommodationId:{in:ids},expiresAt:{gt:new Date()},checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{accommodationId:true}}),
  prisma.manualInventoryBlock.findMany({where:{accommodationId:{in:ids},startsAt:{lt:checkOut},endsAt:{gt:checkIn}},select:{accommodationId:true}})
 ]);
 const blocked=new Set<string>();external.forEach(x=>{if(x.integration.accommodationId)blocked.add(x.integration.accommodationId)});internal.forEach(x=>{if(x.accommodationId)blocked.add(x.accommodationId)});holds.forEach(x=>blocked.add(x.accommodationId));manual.forEach(x=>blocked.add(x.accommodationId));
 return rooms.filter(room=>!blocked.has(room.id));
}
