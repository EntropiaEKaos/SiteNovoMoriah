import {prisma} from "./prisma";

const HOLD_MINUTES=10;
function valid(checkIn:Date,checkOut:Date){if(Number.isNaN(checkIn.getTime())||Number.isNaN(checkOut.getTime())||checkIn>=checkOut)throw new Error("Período inválido.");}

export async function createInventoryHold(accommodationId:string,checkIn:Date,checkOut:Date){
 valid(checkIn,checkOut);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${accommodationId}))`;
  await tx.inventoryHold.deleteMany({where:{expiresAt:{lte:new Date()}}});
  const [bookings,blocks,holds]=await Promise.all([
   tx.bookingLead.count({where:{accommodationId,status:{in:["CONFIRMED","CHECKED_IN"]},checkIn:{lt:checkOut},checkOut:{gt:checkIn}}}),
   tx.channelBlock.count({where:{startsAt:{lt:checkOut},endsAt:{gt:checkIn},integration:{accommodationId,active:true}}}),
   tx.inventoryHold.count({where:{accommodationId,expiresAt:{gt:new Date()},checkIn:{lt:checkOut},checkOut:{gt:checkIn}}})
  ]);
  if(bookings||blocks||holds)throw new Error("Hospedagem indisponível para este período.");
  const expiresAt=new Date(Date.now()+HOLD_MINUTES*60_000);
  return tx.inventoryHold.create({data:{accommodationId,checkIn,checkOut,token:crypto.randomUUID(),expiresAt},select:{token:true,expiresAt:true}});
 });
}
export async function releaseInventoryHold(token:string){if(token)await prisma.inventoryHold.deleteMany({where:{token}});}
