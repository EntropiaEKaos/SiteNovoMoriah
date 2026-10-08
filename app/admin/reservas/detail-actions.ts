"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";
import {hasUnitCapacity} from "../../../lib/shared-inventory";

function text(formData:FormData,name:string,max:number){
  return String(formData.get(name)||"").trim().slice(0,max)||null;
}

export async function updateBookingProfile(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Reserva inválida.");

  const name=String(formData.get("name")||"").trim().slice(0,160);
  const phone=String(formData.get("phone")||"").trim().slice(0,60);
  const email=String(formData.get("email")||"").trim().toLowerCase().slice(0,200)||null;
  const guests=Number(formData.get("guests")||1);

  if(!name||!phone||!Number.isInteger(guests)||guests<1||guests>50){
    throw new Error("Dados da reserva inválidos.");
  }
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("E-mail inválido.");

  await prisma.$transaction(async tx=>{
    const booking=await tx.bookingLead.findUnique({
      where:{id},
      select:{accommodationId:true,checkIn:true,checkOut:true,status:true,guests:true}
    });
    if(!booking)throw new Error("Reserva não encontrada.");

    if(guests!==booking.guests&&booking.accommodationId&&
      (booking.status==="CONFIRMED"||booking.status==="CHECKED_IN")){
      const accommodationId=booking.accommodationId;
      // Serialize guest-count edits with calendar bookings and inventory holds.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${accommodationId}))`;
      const room=await tx.accommodation.findUnique({
        where:{id:accommodationId},
        select:{sharedRoom:true,bedCount:true,capacity:true}
      });
      if(!room)throw new Error("Hospedagem não encontrada.");
      if(guests>room.capacity)throw new Error("Quantidade de hóspedes acima da capacidade.");

      if(room.sharedRoom){
        if(!booking.checkIn||!booking.checkOut)throw new Error("Reserva sem período definido.");
        const [others,holds]=await Promise.all([
          tx.bookingLead.findMany({
            where:{
              id:{not:id},accommodationId,
              status:{in:["CONFIRMED","CHECKED_IN"]},
              checkIn:{lt:booking.checkOut},checkOut:{gt:booking.checkIn}
            },
            select:{checkIn:true,checkOut:true,guests:true}
          }),
          tx.inventoryHold.findMany({
            where:{
              accommodationId,expiresAt:{gt:new Date()},
              checkIn:{lt:booking.checkOut},checkOut:{gt:booking.checkIn}
            },
            select:{checkIn:true,checkOut:true,units:true}
          })
        ]);
        const intervals=[
          ...others.filter(row=>row.checkIn&&row.checkOut).map(row=>({
            start:row.checkIn!,end:row.checkOut!,units:Math.max(1,row.guests)
          })),
          ...holds.map(row=>({
            start:row.checkIn,end:row.checkOut,units:Math.max(1,row.units)
          }))
        ];
        if(!hasUnitCapacity(room.bedCount,guests,intervals,booking.checkIn,booking.checkOut)){
          throw new Error("Não há camas suficientes disponíveis para este período.");
        }
      }
    }

    await tx.bookingLead.update({
      where:{id},
      data:{
        name,phone,email,guests,
        message:text(formData,"message",4000),
        internalNotes:text(formData,"internalNotes",6000)
      }
    });
    await tx.bookingAuditLog.create({
      data:{bookingId:id,action:"BOOKING_PROFILE_UPDATED"}
    });
  });

  revalidatePath("/admin/reservas");
  revalidatePath("/admin/reservas/"+id);
  revalidatePath("/admin/pms");
  revalidatePath("/admin/canais/calendario");
}

export async function addBookingCompanion(formData:FormData){
  await requireAdmin();
  const bookingId=String(formData.get("bookingId")||"");
  const name=String(formData.get("name")||"").trim().slice(0,160);
  const document=text(formData,"document",100);
  const notes=text(formData,"notes",1000);
  const rawBirth=String(formData.get("birthDate")||"").trim();
  const birthDate=rawBirth?new Date(rawBirth+"T12:00:00Z"):null;

  if(!bookingId||!name)throw new Error("Reserva e nome do acompanhante são obrigatórios.");
  if(birthDate&&Number.isNaN(birthDate.getTime()))throw new Error("Data de nascimento inválida.");

  await prisma.$transaction(async tx=>{
    const booking=await tx.bookingLead.findUnique({where:{id:bookingId},select:{id:true}});
    if(!booking)throw new Error("Reserva não encontrada.");
    await tx.bookingCompanion.create({
      data:{bookingId,name,document,birthDate,notes}
    });
    await tx.bookingAuditLog.create({
      data:{bookingId,action:"COMPANION_ADDED",details:{name}}
    });
  });

  revalidatePath("/admin/reservas/"+bookingId);
}

export async function deleteBookingCompanion(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;

  const companion=await prisma.bookingCompanion.findUnique({
    where:{id},
    select:{id:true,bookingId:true,name:true}
  });
  if(!companion)return;

  await prisma.$transaction([
    prisma.bookingCompanion.delete({where:{id}}),
    prisma.bookingAuditLog.create({
      data:{
        bookingId:companion.bookingId,
        action:"COMPANION_REMOVED",
        details:{name:companion.name}
      }
    })
  ]);

  revalidatePath("/admin/reservas/"+companion.bookingId);
}
