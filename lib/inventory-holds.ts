import {prisma} from "./prisma";
import {hasUnitCapacity} from "./shared-inventory";

const HOLD_MINUTES=10;

function valid(checkIn:Date,checkOut:Date){
  if(Number.isNaN(checkIn.getTime())||Number.isNaN(checkOut.getTime())||checkIn>=checkOut){
    throw new Error("Período inválido.");
  }
}

export async function createInventoryHold(
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  requestedUnits=1
){
  valid(checkIn,checkOut);
  const units=Math.max(1,Math.floor(requestedUnits||1));

  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${accommodationId}))`;
    await tx.inventoryHold.deleteMany({where:{expiresAt:{lte:new Date()}}});

    const room=await tx.accommodation.findUnique({
      where:{id:accommodationId},
      select:{sharedRoom:true,bedCount:true,capacity:true,active:true}
    });
    if(!room?.active)throw new Error("Hospedagem indisponível.");

    const [bookings,blocks,holds,manual]=await Promise.all([
      tx.bookingLead.findMany({
        where:{
          accommodationId,
          status:{in:["CONFIRMED","CHECKED_IN"]},
          checkIn:{lt:checkOut},
          checkOut:{gt:checkIn}
        },
        select:{checkIn:true,checkOut:true,guests:true}
      }),
      tx.channelBlock.count({
        where:{
          startsAt:{lt:checkOut},
          endsAt:{gt:checkIn},
          integration:{accommodationId,active:true}
        }
      }),
      tx.inventoryHold.findMany({
        where:{
          accommodationId,
          expiresAt:{gt:new Date()},
          checkIn:{lt:checkOut},
          checkOut:{gt:checkIn}
        },
        select:{checkIn:true,checkOut:true,units:true}
      }),
      tx.manualInventoryBlock.count({
        where:{accommodationId,startsAt:{lt:checkOut},endsAt:{gt:checkIn}}
      })
    ]);

    if(blocks||manual)throw new Error("Hospedagem indisponível para este período.");

    if(room.sharedRoom){
      const intervals=[
        ...bookings
          .filter(row=>row.checkIn&&row.checkOut)
          .map(row=>({start:row.checkIn!,end:row.checkOut!,units:Math.max(1,row.guests)})),
        ...holds.map(row=>({start:row.checkIn,end:row.checkOut,units:Math.max(1,row.units)}))
      ];
      if(!hasUnitCapacity(room.bedCount,units,intervals,checkIn,checkOut)){
        throw new Error("Não há camas suficientes disponíveis para este período.");
      }
    }else if(units>room.capacity||bookings.length||holds.length){
      throw new Error("Hospedagem indisponível para este período.");
    }

    const expiresAt=new Date(Date.now()+HOLD_MINUTES*60_000);
    return tx.inventoryHold.create({
      data:{
        accommodationId,
        checkIn,
        checkOut,
        token:crypto.randomUUID(),
        expiresAt,
        units
      },
      select:{token:true,expiresAt:true,units:true}
    });
  });
}

export async function releaseInventoryHold(token:string){
  if(token)await prisma.inventoryHold.deleteMany({where:{token}});
}

export async function consumeInventoryHold(
  token:string,
  accommodationId:string,
  checkIn:Date,
  checkOut:Date,
  createBooking:(tx:Parameters<Parameters<typeof prisma.$transaction>[0]>[0])=>Promise<unknown>
){
  valid(checkIn,checkOut);
  if(!token)throw new Error("Hold de disponibilidade ausente.");

  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${accommodationId}))`;

    const hold=await tx.inventoryHold.findUnique({where:{token}});
    if(
      !hold||
      hold.accommodationId!==accommodationId||
      hold.expiresAt<=new Date()||
      hold.checkIn.getTime()!==checkIn.getTime()||
      hold.checkOut.getTime()!==checkOut.getTime()
    ){
      throw new Error("O período reservado temporariamente expirou. Consulte a disponibilidade novamente.");
    }

    const room=await tx.accommodation.findUnique({
      where:{id:accommodationId},
      select:{sharedRoom:true,bedCount:true,capacity:true,active:true}
    });
    if(!room?.active)throw new Error("Hospedagem indisponível.");

    const [bookings,blocks,otherHolds,manual]=await Promise.all([
      tx.bookingLead.findMany({
        where:{
          accommodationId,
          status:{in:["CONFIRMED","CHECKED_IN"]},
          checkIn:{lt:checkOut},
          checkOut:{gt:checkIn}
        },
        select:{checkIn:true,checkOut:true,guests:true}
      }),
      tx.channelBlock.count({
        where:{
          startsAt:{lt:checkOut},
          endsAt:{gt:checkIn},
          integration:{accommodationId,active:true}
        }
      }),
      tx.inventoryHold.findMany({
        where:{
          token:{not:token},
          accommodationId,
          expiresAt:{gt:new Date()},
          checkIn:{lt:checkOut},
          checkOut:{gt:checkIn}
        },
        select:{checkIn:true,checkOut:true,units:true}
      }),
      tx.manualInventoryBlock.count({
        where:{accommodationId,startsAt:{lt:checkOut},endsAt:{gt:checkIn}}
      })
    ]);

    if(blocks||manual){
      throw new Error("A disponibilidade mudou durante a reserva. Consulte o período novamente.");
    }

    if(room.sharedRoom){
      const intervals=[
        ...bookings
          .filter(row=>row.checkIn&&row.checkOut)
          .map(row=>({start:row.checkIn!,end:row.checkOut!,units:Math.max(1,row.guests)})),
        ...otherHolds.map(row=>({start:row.checkIn,end:row.checkOut,units:Math.max(1,row.units)}))
      ];
      if(!hasUnitCapacity(room.bedCount,Math.max(1,hold.units),intervals,checkIn,checkOut)){
        throw new Error("A quantidade de camas disponíveis mudou durante a reserva.");
      }
    }else if(hold.units>room.capacity||bookings.length||otherHolds.length){
      throw new Error("A disponibilidade mudou durante a reserva. Consulte o período novamente.");
    }

    await createBooking(tx);
    await tx.inventoryHold.delete({where:{token}});
    return true;
  });
}
