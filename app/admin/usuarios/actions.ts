"use server";
import {revalidatePath} from "next/cache";
import {prisma} from "../../../lib/prisma";
import {hashAdminPassword} from "../../../lib/admin-password";
import {requireSuperAdmin} from "../../../lib/admin-auth";

export async function createAdminUser(formData:FormData){
  const actor=await requireSuperAdmin();
  const username=String(formData.get("username")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  const role=String(formData.get("role")||"ADMIN");
  if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new Error("Usuário inválido.");
  if(!["ADMIN","SUPERADMIN"].includes(role))throw new Error("Perfil inválido.");
  const passwordHash=await hashAdminPassword(password);
  await prisma.adminUser.create({data:{username,passwordHash,role,active:true}});
  void actor;
  revalidatePath("/admin/usuarios");
}
export async function toggleAdminUser(formData:FormData){
  const actor=await requireSuperAdmin();
  const id=String(formData.get("id")||"");
  const target=await prisma.adminUser.findUnique({where:{id}});
  if(!target)throw new Error("Administrador não encontrado.");
  if(target.id===actor.userId)throw new Error("Você não pode desativar a própria conta.");
  if(target.role==="SUPERADMIN"&&target.active){
    const activeSupers=await prisma.adminUser.count({where:{role:"SUPERADMIN",active:true}});
    if(activeSupers<=1)throw new Error("O sistema precisa manter pelo menos um Super Admin ativo.");
  }
  await prisma.adminUser.update({where:{id},data:{active:!target.active}});
  revalidatePath("/admin/usuarios");
}
export async function resetAdminPassword(formData:FormData){
  await requireSuperAdmin();
  const id=String(formData.get("id")||"");
  const password=String(formData.get("password")||"");
  const passwordHash=await hashAdminPassword(password);
  await prisma.adminUser.update({where:{id},data:{passwordHash}});
  revalidatePath("/admin/usuarios");
}
