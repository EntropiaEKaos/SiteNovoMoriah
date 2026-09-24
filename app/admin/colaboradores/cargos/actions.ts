"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";

function text(formData:FormData,key:string,max:number){
  return String(formData.get(key)||"").trim().slice(0,max);
}
function missingSchema(error:unknown){
  const record=error&&typeof error==="object"?error as {code?:unknown;message?:unknown}:null;
  const code=String(record?.code||"");
  const message=String(record?.message||"");
  return code==="P2021"||message.includes("StaffPosition")||message.includes("StaffAssignment");
}
function refresh(){
  revalidatePath("/admin/colaboradores/cargos");
  revalidatePath("/admin/hospedes");
}

export async function createStaffPosition(formData:FormData){
  const actor=await requireAdmin();
  const name=text(formData,"name",120);
  const description=text(formData,"description",1200)||null;
  const sortRaw=Number(formData.get("sortOrder")||100);
  const sortOrder=Number.isFinite(sortRaw)?Math.max(0,Math.min(9999,Math.round(sortRaw))):100;
  if(!name)throw new Error("Informe o nome do cargo.");

  try{
    const exists=await prisma.staffPosition.findFirst({
      where:{name:{equals:name,mode:"insensitive"}},
      select:{id:true}
    });
    if(exists)throw new Error("Já existe um cargo com esse nome.");

    const row=await prisma.staffPosition.create({data:{name,description,sortOrder}});
    await prisma.adminAuditLog.create({
      data:{
        actorId:actor.userId,
        action:"STAFF_POSITION_CREATED",
        targetType:"StaffPosition",
        targetId:row.id,
        details:{name}
      }
    });
  }catch(error){
    if(missingSchema(error))throw new Error("O módulo de cargos aguarda a migration do banco.");
    throw error;
  }
  refresh();
}

export async function updateStaffPosition(formData:FormData){
  const actor=await requireAdmin();
  const id=text(formData,"id",100);
  const name=text(formData,"name",120);
  const description=text(formData,"description",1200)||null;
  const sortRaw=Number(formData.get("sortOrder")||100);
  const sortOrder=Number.isFinite(sortRaw)?Math.max(0,Math.min(9999,Math.round(sortRaw))):100;
  if(!id||!name)throw new Error("Cargo inválido.");

  const duplicate=await prisma.staffPosition.findFirst({
    where:{id:{not:id},name:{equals:name,mode:"insensitive"}},
    select:{id:true}
  });
  if(duplicate)throw new Error("Já existe outro cargo com esse nome.");

  await prisma.staffPosition.update({where:{id},data:{name,description,sortOrder}});
  await prisma.adminAuditLog.create({
    data:{
      actorId:actor.userId,
      action:"STAFF_POSITION_UPDATED",
      targetType:"StaffPosition",
      targetId:id,
      details:{name}
    }
  });
  refresh();
}

export async function toggleStaffPosition(formData:FormData){
  const actor=await requireAdmin();
  const id=text(formData,"id",100);
  const row=await prisma.staffPosition.findUnique({where:{id},select:{active:true,name:true}});
  if(!row)throw new Error("Cargo não encontrado.");
  await prisma.staffPosition.update({where:{id},data:{active:!row.active}});
  await prisma.adminAuditLog.create({
    data:{
      actorId:actor.userId,
      action:row.active?"STAFF_POSITION_DISABLED":"STAFF_POSITION_ENABLED",
      targetType:"StaffPosition",
      targetId:id,
      details:{name:row.name}
    }
  });
  refresh();
}

export async function deleteStaffPosition(formData:FormData){
  const actor=await requireAdmin();
  const id=text(formData,"id",100);
  const row=await prisma.staffPosition.findUnique({
    where:{id},
    select:{name:true,_count:{select:{assignments:true}}}
  });
  if(!row)return;
  if(row._count.assignments>0){
    throw new Error("Este cargo está vinculado a colaboradores. Desative-o em vez de excluir.");
  }
  await prisma.staffPosition.delete({where:{id}});
  await prisma.adminAuditLog.create({
    data:{
      actorId:actor.userId,
      action:"STAFF_POSITION_DELETED",
      targetType:"StaffPosition",
      targetId:id,
      details:{name:row.name}
    }
  });
  refresh();
}
