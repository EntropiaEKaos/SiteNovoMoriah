"use server";
import {createHash} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {clearAdminSession,createAdminSession,getAdminSession} from "../../../lib/admin-auth";
import {verifyAdminPassword} from "../../../lib/admin-password";
import {prisma} from "../../../lib/prisma";
import {closeStaffPresence} from "../../../lib/staff-presence";

const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=8;
async function loginKey(username:string){
  const h=await headers();
  const ip=(h.get("x-forwarded-for")||h.get("x-real-ip")||"unknown").split(",")[0].trim();
  return createHash("sha256").update(ip+"|"+username).digest("hex");
}
export async function loginAdmin(formData:FormData){
  const username=String(formData.get("user")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  if(!username||!password||!process.env.SESSION_SECRET)redirect("/admin/login?error=1");
  const keyHash=await loginKey(username);
  const cutoff=new Date(Date.now()-WINDOW_MS);
  await prisma.adminLoginAttempt.deleteMany({where:{createdAt:{lt:cutoff}}});
  const attempts=await prisma.adminLoginAttempt.count({where:{keyHash,createdAt:{gte:cutoff}}});
  if(attempts>=MAX_ATTEMPTS)redirect("/admin/login?error=rate");
  const admin=await prisma.adminUser.findUnique({where:{username}});
  const valid=Boolean(admin?.active)&&Boolean(admin&&await verifyAdminPassword(password,admin.passwordHash));
  if(!valid){
    await prisma.adminLoginAttempt.create({data:{keyHash}});
    redirect("/admin/login?error=1");
  }
  await prisma.$transaction([
    prisma.adminLoginAttempt.deleteMany({where:{keyHash}}),
    prisma.adminUser.update({where:{id:admin!.id},data:{lastLoginAt:new Date()}}),
    prisma.adminAuditLog.create({data:{actorId:admin!.id,action:"ADMIN_LOGIN",targetType:"AdminUser",targetId:admin!.id}})
  ]);
  await createAdminSession({id:admin!.id,username:admin!.username,role:admin!.role});
  redirect("/admin");
}
export async function logoutAdmin(){
  const session=await getAdminSession();
  if(session){
    try{await closeStaffPresence(session.userId,"LOGOUT")}catch(error){console.error("STAFF_PRESENCE_LOGOUT_FAILED",error)}
  }
  await clearAdminSession();
  redirect("/admin/login");
}
