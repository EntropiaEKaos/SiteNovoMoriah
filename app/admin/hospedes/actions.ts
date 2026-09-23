"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

function readGuest(formData:FormData){
  const name=String(formData.get("name")||"").trim().slice(0,160);
  const phone=String(formData.get("phone")||"").trim().slice(0,60);
  const email=String(formData.get("email")||"").trim().toLowerCase().slice(0,200)||null;
  const document=String(formData.get("document")||"").trim().slice(0,100)||null;
  const notes=String(formData.get("notes")||"").trim().slice(0,4000)||null;

  if(!name||!phone)throw new Error("Nome e telefone/WhatsApp são obrigatórios.");
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("E-mail inválido.");

  return {name,phone,email,document,notes};
}

export async function createGuest(formData:FormData){
  await requireAdmin();
  const data=readGuest(formData);

  const duplicate=await prisma.guest.findFirst({
    where:{
      OR:[
        ...(data.document?[{document:data.document}]:[]),
        {name:data.name,phone:data.phone}
      ]
    },
    select:{id:true}
  });

  if(duplicate)redirect("/admin/hospedes/"+duplicate.id);

  const guest=await prisma.guest.create({data});
  revalidatePath("/admin/hospedes");
  redirect("/admin/hospedes/"+guest.id);
}

export async function updateGuest(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Hóspede inválido.");
  const data=readGuest(formData);

  await prisma.guest.update({where:{id},data});
  revalidatePath("/admin/hospedes");
  revalidatePath("/admin/hospedes/"+id);
}

export async function linkGuestBooking(formData:FormData){
  await requireAdmin();
  const guestId=String(formData.get("guestId")||"");
  const bookingId=String(formData.get("bookingId")||"");
  if(!guestId||!bookingId)throw new Error("Vínculo inválido.");

  const [guest,booking]=await Promise.all([
    prisma.guest.findUnique({where:{id:guestId},select:{id:true}}),
    prisma.bookingLead.findUnique({where:{id:bookingId},select:{id:true,guestId:true}})
  ]);
  if(!guest||!booking)throw new Error("Hóspede ou reserva não encontrados.");
  if(booking.guestId&&booking.guestId!==guestId)throw new Error("Esta reserva já está vinculada a outro hóspede.");

  await prisma.bookingLead.update({where:{id:bookingId},data:{guestId}});
  revalidatePath("/admin/hospedes/"+guestId);
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/pms");
}
