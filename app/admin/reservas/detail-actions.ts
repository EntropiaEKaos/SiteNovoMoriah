"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";

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

  await prisma.$transaction([
    prisma.bookingLead.update({
      where:{id},
      data:{
        name,
        phone,
        email,
        guests,
        message:text(formData,"message",4000),
        internalNotes:text(formData,"internalNotes",6000)
      }
    }),
    prisma.bookingAuditLog.create({
      data:{bookingId:id,action:"BOOKING_PROFILE_UPDATED"}
    })
  ]);

  revalidatePath("/admin/reservas");
  revalidatePath("/admin/reservas/"+id);
  revalidatePath("/admin/pms");
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
