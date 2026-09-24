"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

function isMissingStaffSchema(error:unknown){
  const record=error&&typeof error==="object"?error as {code?:unknown;message?:unknown}:null;
  const code=String(record?.code||"");
  const message=String(record?.message||"");
  return code==="P2021"||message.includes("StaffPosition")||message.includes("StaffAssignment");
}

async function validateStaffPositionChoice(employee:boolean,positionId:string|null){
  if(!employee)return;
  try{
    if(!positionId){
      await prisma.staffPosition.count();
      throw new Error("Selecione o cargo do colaborador.");
    }
    const position=await prisma.staffPosition.findUnique({
      where:{id:positionId},
      select:{id:true,active:true}
    });
    if(!position?.active)throw new Error("Selecione um cargo ativo para o colaborador.");
  }catch(error){
    if(isMissingStaffSchema(error)){
      if(positionId)throw new Error("O módulo de cargos aguarda a migration do banco.");
      return;
    }
    throw error;
  }
}

async function syncStaffAssignment(guestId:string,employee:boolean,positionId:string|null){
  try{
    if(!employee){
      await prisma.staffAssignment.deleteMany({where:{guestId}});
      return;
    }
    if(!positionId)return;
    await prisma.staffAssignment.upsert({
      where:{guestId},
      create:{guestId,positionId},
      update:{positionId}
    });
  }catch(error){
    if(isMissingStaffSchema(error))return;
    throw error;
  }
}

function readGuest(formData:FormData){
  const value=(name:string,max:number)=>String(formData.get(name)||"").trim().slice(0,max)||null;
  const name=String(formData.get("name")||"").trim().slice(0,160);
  const phone=String(formData.get("phone")||"").trim().slice(0,60);
  const email=String(formData.get("email")||"").trim().toLowerCase().slice(0,200)||null;
  const document=value("document",100);
  const documentType=value("documentType",40);
  const birthDateRaw=String(formData.get("birthDate")||"").trim();
  const birthDate=birthDateRaw?new Date(birthDateRaw+"T12:00:00Z"):null;
  const nationality=value("nationality",100);
  const address=value("address",240);
  const city=value("city",120);
  const state=value("state",80);
  const postalCode=value("postalCode",30);
  const preferences=value("preferences",4000);
  const emergencyContact=value("emergencyContact",300);
  const notes=value("notes",4000);
  const monthlyGuest=formData.get("monthlyGuest")==="on";
  const monthlyPaymentDueRaw=String(formData.get("monthlyPaymentDueAt")||"").trim();
  const monthlyPaymentDueAt=monthlyGuest&&monthlyPaymentDueRaw
    ?new Date(monthlyPaymentDueRaw+"T12:00:00Z")
    :null;
  const employee=formData.get("employee")==="on";
  const employeePositionId=employee
    ?String(formData.get("employeePositionId")||"").trim()||null
    :null;

  if(!name||!phone)throw new Error("Nome e telefone/WhatsApp são obrigatórios.");
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("E-mail inválido.");
  if(birthDate&&Number.isNaN(birthDate.getTime()))throw new Error("Data de nascimento inválida.");
  if(monthlyPaymentDueAt&&Number.isNaN(monthlyPaymentDueAt.getTime()))throw new Error("Data de pagamento do mensalista inválida.");

  return {
    name,
    phone,
    email,
    document,
    documentType,
    birthDate,
    nationality,
    address,
    city,
    state,
    postalCode,
    preferences,
    emergencyContact,
    notes,
    monthlyGuest,
    monthlyPaymentDueAt,
    employee,
    employeePositionId
  };
}

export async function createGuest(formData:FormData){
  await requireAdmin();
  const raw=readGuest(formData);
  const {employeePositionId,...data}=raw;
  await validateStaffPositionChoice(data.employee,employeePositionId);

  const duplicate=await prisma.guest.findFirst({
    where:{
      OR:[
        ...(data.document?[{document:data.document}]:[]),
        {name:data.name,phone:data.phone}
      ]
    },
    select:{id:true,monthlyGuest:true,employee:true}
  });

  if(duplicate){
    if(
      (data.monthlyGuest&&!duplicate.monthlyGuest)||
      (data.employee&&!duplicate.employee)
    ){
      await prisma.guest.update({
        where:{id:duplicate.id},
        data:{
          monthlyGuest:duplicate.monthlyGuest||data.monthlyGuest,
          monthlyPaymentDueAt:data.monthlyPaymentDueAt||undefined,
          employee:duplicate.employee||data.employee
        }
      });
      await syncStaffAssignment(
        duplicate.id,
        duplicate.employee||data.employee,
        employeePositionId
      );
      revalidatePath("/admin/hospedes");
      revalidatePath("/admin/hospedes/"+duplicate.id);
    }
    redirect("/admin/hospedes/"+duplicate.id);
  }

  const guest=await prisma.guest.create({data});
  await syncStaffAssignment(guest.id,data.employee,employeePositionId);
  revalidatePath("/admin/hospedes");
  redirect("/admin/hospedes/"+guest.id);
}

export async function updateGuest(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Hóspede inválido.");
  const raw=readGuest(formData);
  const {employeePositionId,...data}=raw;
  await validateStaffPositionChoice(data.employee,employeePositionId);

  await prisma.guest.update({where:{id},data});
  await syncStaffAssignment(id,data.employee,employeePositionId);
  revalidatePath("/admin/hospedes");
  revalidatePath("/admin/hospedes/"+id);
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/colaboradores/cargos");
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


export async function registerMonthlyPayment(formData:FormData){
  const actor=await requireAdmin();
  const id=String(formData.get("id")||"");
  const paidAtRaw=String(formData.get("paidAt")||"").trim();
  if(!id)throw new Error("Mensalista inválido.");

  const guest=await prisma.guest.findUnique({
    where:{id},
    select:{id:true,name:true,monthlyGuest:true,monthlyPaymentDueAt:true}
  });
  if(!guest?.monthlyGuest)throw new Error("Este cadastro não está marcado como mensalista.");

  const paidAt=paidAtRaw?new Date(paidAtRaw+"T12:00:00Z"):new Date();
  if(Number.isNaN(paidAt.getTime()))throw new Error("Data de pagamento inválida.");

  const base=guest.monthlyPaymentDueAt&&guest.monthlyPaymentDueAt>paidAt
    ?guest.monthlyPaymentDueAt
    :paidAt;
  const nextDueAt=new Date(base);
  nextDueAt.setUTCMonth(nextDueAt.getUTCMonth()+1);

  await prisma.$transaction([
    prisma.guest.update({
      where:{id},
      data:{monthlyPaymentLastPaidAt:paidAt,monthlyPaymentDueAt:nextDueAt}
    }),
    prisma.adminAuditLog.create({
      data:{
        actorId:actor.userId,
        action:"MONTHLY_GUEST_PAYMENT_RECORDED",
        targetType:"Guest",
        targetId:id,
        details:{
          guestName:guest.name,
          paidAt:paidAt.toISOString(),
          previousDueAt:guest.monthlyPaymentDueAt?.toISOString()||null,
          nextDueAt:nextDueAt.toISOString()
        }
      }
    })
  ]);

  revalidatePath("/admin/hospedes");
  revalidatePath("/admin/hospedes/"+id);
  revalidatePath("/admin/notificacoes");
}
