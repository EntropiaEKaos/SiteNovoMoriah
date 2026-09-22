"use server";
import {redirect} from "next/navigation";
import {clearAdminSession,createAdminSession} from "../../../lib/admin-auth";
import {verifyAdminPassword} from "../../../lib/admin-password";
import {prisma} from "../../../lib/prisma";

export async function loginAdmin(formData:FormData){
  const username=String(formData.get("user")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  if(!username||!password||!process.env.SESSION_SECRET)redirect("/admin/login?error=1");
  const admin=await prisma.adminUser.findUnique({where:{username}});
  if(!admin||!admin.active||!(await verifyAdminPassword(password,admin.passwordHash)))redirect("/admin/login?error=1");
  await prisma.adminUser.update({where:{id:admin.id},data:{lastLoginAt:new Date()}});
  await createAdminSession({id:admin.id,username:admin.username,role:admin.role});
  redirect("/admin");
}
export async function logoutAdmin(){await clearAdminSession();redirect("/admin/login")}
