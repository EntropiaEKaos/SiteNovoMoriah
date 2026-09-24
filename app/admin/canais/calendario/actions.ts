"use server";

import {revalidatePath} from "next/cache";
import type {Prisma} from "@prisma/client";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";
import {quoteAccommodation} from "../../../../lib/rate-engine";
import {syncAccommodationChannels} from "../../../../lib/channel-sync";

function parseDate(value:FormDataEntryValue|null){
  const raw=String(value||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error("Data inválida.");
  const date=new Date(raw+"T12:00:00Z");
  if(Number.isNaN(date.getTime()))throw new Error("Data inválida.");
  return date;
}

function validRange(start:Date,end:Date){
  if(!(start<end))throw new Error("A saída/fim deve ser posterior à entrada/início.");
}

async function assertInventoryFree(
  tx:Prisma.TransactionClient,
  accommodationId:string,
  start:Date,
  end:Date,
  excludeBookingId?:string
){
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${accommodationId}))`;

  const [internal,external,holds,manual]=await Promise.all([
    tx.bookingLead.count({
      where:{
        id:excludeBookingId?{not:excludeBookingId}:undefined,
        accommodationId,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkIn:{lt:end},
        checkOut:{gt:start}
      }
    }),
    tx.channelBlock.count({
      where:{
        startsAt:{lt:end},
        endsAt:{gt:start},
        integration:{accommodationId,active:true}
      }
    }),
    tx.inventoryHold.count({
      where:{
        accommodationId,
        expiresAt:{gt:new Date()},
        checkIn:{lt:end},
        checkOut:{gt:start}
      }
    }),
    tx.manualInventoryBlock.count({
      where:{
        accommodationId,
        startsAt:{lt:end},
        endsAt:{gt:start}
      }
    })
  ]);

  if(internal||external||holds||manual){
    throw new Error("O período conflita com reserva, canal, hold ou bloqueio manual.");
  }
}

export async function createManualBlock(formData:FormData){
  await requireAdmin();
  const accommodationId=String(formData.get("accommodationId")||"");
  const startsAt=parseDate(formData.get("startsAt"));
  const endsAt=parseDate(formData.get("endsAt"));
  const reason=String(formData.get("reason")||"").trim().slice(0,160);
  const notes=String(formData.get("notes")||"").trim().slice(0,1500)||null;

  if(!accommodationId||!reason)throw new Error("Hospedagem e motivo são obrigatórios.");
  validRange(startsAt,endsAt);

  const room=await prisma.accommodation.findUnique({
    where:{id:accommodationId},
    select:{id:true,active:true}
  });
  if(!room?.active)throw new Error("Hospedagem não encontrada ou inativa.");

  const sync=await syncAccommodationChannels(accommodationId);
  if(sync.failures)throw new Error("Não foi possível atualizar todos os canais antes do bloqueio.");

  await prisma.$transaction(async tx=>{
    await assertInventoryFree(tx,accommodationId,startsAt,endsAt);
    await tx.manualInventoryBlock.create({
      data:{accommodationId,startsAt,endsAt,reason,notes}
    });
  });

  revalidatePath("/admin/canais/calendario");
  revalidatePath("/reservar");
}

export async function deleteManualBlock(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Bloqueio inválido.");
  await prisma.manualInventoryBlock.delete({where:{id}});
  revalidatePath("/admin/canais/calendario");
  revalidatePath("/reservar");
}

export async function createMapBooking(formData:FormData){
  await requireAdmin();

  const accommodationId=String(formData.get("accommodationId")||"");
  const checkIn=parseDate(formData.get("checkIn"));
  const checkOut=parseDate(formData.get("checkOut"));
  const name=String(formData.get("name")||"").trim().slice(0,160);
  const phone=String(formData.get("phone")||"").trim().slice(0,60);
  const email=String(formData.get("email")||"").trim().toLowerCase().slice(0,200)||null;
  const guests=Number(formData.get("guests")||1);
  const internalNotes=String(formData.get("internalNotes")||"").trim().slice(0,3000)||null;

  validRange(checkIn,checkOut);
  if(!accommodationId||!name||!phone||!Number.isInteger(guests)||guests<1||guests>50){
    throw new Error("Dados da reserva inválidos.");
  }
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("E-mail inválido.");

  const room=await prisma.accommodation.findUnique({
    where:{id:accommodationId},
    select:{id:true,active:true,capacity:true}
  });
  if(!room?.active)throw new Error("Hospedagem inativa ou inexistente.");
  if(guests>room.capacity)throw new Error("Quantidade de hóspedes acima da capacidade.");

  const sync=await syncAccommodationChannels(accommodationId);
  if(sync.failures)throw new Error("Não foi possível atualizar todos os canais antes da reserva.");

  const quote=await quoteAccommodation(accommodationId,checkIn,checkOut);
  if(!quote)throw new Error("Não há tarifa vendável para o período.");

  await prisma.$transaction(async tx=>{
    await assertInventoryFree(tx,accommodationId,checkIn,checkOut);

    let guest=await tx.guest.findFirst({
      where:{name,phone},
      select:{id:true}
    });

    if(!guest){
      guest=await tx.guest.create({
        data:{name,phone,email},
        select:{id:true}
      });
    }

    const booking=await tx.bookingLead.create({
      data:{
        accommodationId,
        guestId:guest.id,
        name,
        phone,
        email,
        guests,
        checkIn,
        checkOut,
        status:"CONFIRMED",
        source:"ADMIN_MAP",
        internalNotes,
        quotedTotalCents:quote.totalCents,
        quotedCurrency:quote.currency,
        quotedRatePlan:quote.ratePlan,
        quoteSnapshot:JSON.parse(JSON.stringify(quote)),
        quotedAt:new Date()
      }
    });

    await tx.bookingAuditLog.create({
      data:{
        bookingId:booking.id,
        action:"CREATED_FROM_CALENDAR",
        details:{accommodationId,checkIn:checkIn.toISOString(),checkOut:checkOut.toISOString()}
      }
    });
  });

  revalidatePath("/admin/canais/calendario");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/pms");
  revalidatePath("/admin/hospedes");
  revalidatePath("/reservar");
}

export async function updateConfirmedBookingPlacement(formData:FormData){
  await requireAdmin();

  const id=String(formData.get("id")||"");
  const accommodationId=String(formData.get("accommodationId")||"");
  const checkIn=parseDate(formData.get("checkIn"));
  const checkOut=parseDate(formData.get("checkOut"));
  validRange(checkIn,checkOut);

  const booking=await prisma.bookingLead.findUnique({where:{id}});
  if(!booking||booking.status!=="CONFIRMED"){
    throw new Error("Somente reservas confirmadas podem ser movimentadas pelo mapa.");
  }
  if(!accommodationId)throw new Error("Selecione a nova hospedagem.");

  const room=await prisma.accommodation.findUnique({
    where:{id:accommodationId},
    select:{id:true,active:true,capacity:true}
  });
  if(!room?.active)throw new Error("Hospedagem inativa ou inexistente.");
  if(booking.guests>room.capacity)throw new Error("A nova hospedagem não comporta todos os hóspedes.");

  const snapshot=booking.quoteSnapshot as {appliedPromotions?:unknown}|null;
  if(Array.isArray(snapshot?.appliedPromotions)&&snapshot.appliedPromotions.length){
    throw new Error("Reserva com promoção aplicada deve ser alterada pela ficha de reserva.");
  }

  const sync=await syncAccommodationChannels(accommodationId);
  if(sync.failures)throw new Error("Não foi possível atualizar os canais antes da alteração.");

  const quote=await quoteAccommodation(accommodationId,checkIn,checkOut);
  if(!quote)throw new Error("Não há tarifa vendável para o novo período.");

  await prisma.$transaction(async tx=>{
    await assertInventoryFree(tx,accommodationId,checkIn,checkOut,id);

    await tx.bookingLead.update({
      where:{id},
      data:{
        accommodationId,
        checkIn,
        checkOut,
        quotedTotalCents:quote.totalCents,
        quotedCurrency:quote.currency,
        quotedRatePlan:quote.ratePlan,
        quoteSnapshot:JSON.parse(JSON.stringify(quote)),
        quotedAt:new Date()
      }
    });

    await tx.bookingAuditLog.create({
      data:{
        bookingId:id,
        action:"PLACEMENT_CHANGED_FROM_CALENDAR",
        details:{
          fromAccommodationId:booking.accommodationId,
          toAccommodationId:accommodationId,
          checkIn:checkIn.toISOString(),
          checkOut:checkOut.toISOString(),
          quotedTotalCents:quote.totalCents
        }
      }
    });
  });

  revalidatePath("/admin/canais/calendario");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/reservas/"+id);
  revalidatePath("/admin/pms");
  revalidatePath("/reservar");
}

export async function updateConfirmedBookingDates(formData:FormData){
  const id=String(formData.get("id")||"");
  const booking=await prisma.bookingLead.findUnique({
    where:{id},
    select:{accommodationId:true}
  });
  if(!booking?.accommodationId)throw new Error("Reserva sem hospedagem.");

  const bridged=new FormData();
  bridged.set("id",id);
  bridged.set("accommodationId",booking.accommodationId);
  bridged.set("checkIn",String(formData.get("checkIn")||""));
  bridged.set("checkOut",String(formData.get("checkOut")||""));
  return updateConfirmedBookingPlacement(bridged);
}
