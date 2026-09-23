"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";
import {isAccommodationAvailable} from "../../../../lib/inventory-engine";
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

export async function createManualBlock(formData:FormData){
  await requireAdmin();
  const accommodationId=String(formData.get("accommodationId")||"");
  const startsAt=parseDate(formData.get("startsAt"));
  const endsAt=parseDate(formData.get("endsAt"));
  const reason=String(formData.get("reason")||"").trim().slice(0,160);
  const notes=String(formData.get("notes")||"").trim().slice(0,1500)||null;

  if(!accommodationId||!reason)throw new Error("Hospedagem e motivo são obrigatórios.");
  validRange(startsAt,endsAt);

  const room=await prisma.accommodation.findUnique({where:{id:accommodationId},select:{id:true}});
  if(!room)throw new Error("Hospedagem não encontrada.");

  const sync=await syncAccommodationChannels(accommodationId);
  if(sync.failures)throw new Error("Não foi possível atualizar todos os canais antes do bloqueio.");

  if(!(await isAccommodationAvailable(accommodationId,startsAt,endsAt))){
    throw new Error("O período já possui reserva, hold ou outro bloqueio.");
  }

  await prisma.manualInventoryBlock.create({
    data:{accommodationId,startsAt,endsAt,reason,notes}
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

export async function updateConfirmedBookingDates(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const checkIn=parseDate(formData.get("checkIn"));
  const checkOut=parseDate(formData.get("checkOut"));
  validRange(checkIn,checkOut);

  const booking=await prisma.bookingLead.findUnique({where:{id}});
  if(!booking||booking.status!=="CONFIRMED"||!booking.accommodationId){
    throw new Error("Somente reservas confirmadas podem ter as datas alteradas pelo mapa.");
  }

  const snapshot=booking.quoteSnapshot as {appliedPromotions?:unknown}|null;
  if(Array.isArray(snapshot?.appliedPromotions)&&snapshot.appliedPromotions.length){
    throw new Error("Reserva com promoção aplicada deve ser alterada pela ficha de reserva.");
  }

  const sync=await syncAccommodationChannels(booking.accommodationId);
  if(sync.failures)throw new Error("Não foi possível atualizar todos os canais antes da alteração.");

  const available=await isAccommodationAvailable(
    booking.accommodationId,
    checkIn,
    checkOut,
    booking.id
  );
  if(!available)throw new Error("O novo período conflita com outra reserva ou bloqueio.");

  const quote=await quoteAccommodation(booking.accommodationId,checkIn,checkOut);
  if(!quote)throw new Error("Não há tarifa vendável para o novo período.");

  await prisma.$transaction([
    prisma.bookingLead.update({
      where:{id},
      data:{
        checkIn,
        checkOut,
        quotedTotalCents:quote.totalCents,
        quotedCurrency:quote.currency,
        quotedRatePlan:quote.ratePlan,
        quoteSnapshot:JSON.parse(JSON.stringify(quote)),
        quotedAt:new Date()
      }
    }),
    prisma.bookingAuditLog.create({
      data:{
        bookingId:id,
        action:"DATES_CHANGED_FROM_CALENDAR",
        details:{
          checkIn:checkIn.toISOString(),
          checkOut:checkOut.toISOString(),
          quotedTotalCents:quote.totalCents
        }
      }
    })
  ]);

  revalidatePath("/admin/canais/calendario");
  revalidatePath("/admin/reservas");
  revalidatePath("/reservar");
}
