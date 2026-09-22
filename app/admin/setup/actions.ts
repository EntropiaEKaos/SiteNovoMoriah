"use server";
import {redirect} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import {hashAdminPassword} from "../../../lib/admin-password";
import {createAdminSession} from "../../../lib/admin-auth";

export async function bootstrapSuperAdmin(formData:FormData){
  const existing=await prisma.adminUser.count();
  if(existing>0)redirect("/admin/login");
  const username=String(formData.get("username")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  const confirmation=String(formData.get("confirmation")||"");
  if(!/^[a-z0-9._-]{3,40}$/.test(username))redirect("/admin/setup?error=user");
  if(password!==confirmation)redirect("/admin/setup?error=match");
  let passwordHash:string;
  try{passwordHash=await hashAdminPassword(password)}catch{redirect("/admin/setup?error=password")}
  try{
    const admin=await prisma.adminUser.create({data:{username,passwordHash,role:"SUPERADMIN",active:true}});
    await createAdminSession({id:admin.id,username:admin.username,role:admin.role});
  }catch{redirect("/admin/login")}
  redirect("/admin");
}
