"use server";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import {getSmoobuReservationPreview} from "../../../lib/smoobu-client";
import {diagnoseSmoobuReservations} from "../../../lib/smoobu-reservation-diagnostics";
import {revalidatePath} from "next/cache";

/** Imports operational metadata only; does NOT create PMS bookings or touch inventory. */
export async function importSmoobuReservationInbox(){
 await requireAdmin();
 const [reservations,mappings]=await Promise.all([
  getSmoobuReservationPreview(),
  prisma.smoobuAccommodationMapping.findMany({select:{smoobuApartmentId:true,accommodationId:true}})
 ]);
 const diagnostics=diagnoseSmoobuReservations(reservations,mappings);
 // Abort the entire snapshot if duplicate identifiers appear; never silently overwrite one.
 if(diagnostics.some(x=>x.issues.some(issue=>issue.includes("duplicado")||issue.includes("ID de reserva inválido"))))throw new Error("Prévia Smoobu contém IDs duplicados ou inválidos. Importação bloqueada.");
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('smoobu-reservation-inbox'))`;
  for(const {reservation,issues,mappedAccommodationId} of diagnostics){
   const values={apartmentId:reservation.apartmentId,accommodationId:mappedAccommodationId,arrival:reservation.arrival,departure:reservation.departure,externalStatus:reservation.status,validationIssues:issues};
   await tx.smoobuReservationInbox.upsert({where:{externalId:reservation.externalId},create:{externalId:reservation.externalId,...values},update:values});
  }
  await tx.adminAuditLog.create({data:{action:"SMOOBU_INBOX_REFRESHED",targetType:"SmoobuReservationInbox",details:{count:diagnostics.length,warnings:diagnostics.filter(x=>x.issues.length).length,scope:"FIRST_PAGE_READ_ONLY"}}});
 });
 revalidatePath("/admin/canais");
}

export async function reviewSmoobuReservation(formData:FormData){
 await requireAdmin();
 const id=Number(formData.get("externalId"));
 const status=String(formData.get("reviewStatus")||"");
 if(!Number.isSafeInteger(id)||id<=0||!["PENDING","REVIEWED","NEEDS_ATTENTION"].includes(status))throw new Error("Revisão inválida.");
 await prisma.$transaction(async tx=>{
  await tx.smoobuReservationInbox.update({where:{externalId:id},data:{reviewStatus:status}});
  await tx.adminAuditLog.create({data:{action:"SMOOBU_INBOX_REVIEWED",targetType:"SmoobuReservationInbox",targetId:String(id),details:{reviewStatus:status}}});
 });
 revalidatePath("/admin/canais");
}
