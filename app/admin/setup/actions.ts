"use server";
import {createHash,timingSafeEqual} from "node:crypto";
import {redirect} from "next/navigation";
import {prisma} from "../../../lib/prisma";
import {hashAdminPassword} from "../../../lib/admin-password";
import {createAdminSession} from "../../../lib/admin-auth";

const BOOTSTRAP_LOCK=731946281;

function safeTokenEqual(value:string,expected:string){
  const a=createHash("sha256").update(value).digest();
  const b=createHash("sha256").update(expected).digest();
  return timingSafeEqual(a,b);
}

export async function bootstrapSuperAdmin(formData:FormData){
  const expected=process.env.ADMIN_BOOTSTRAP_TOKEN||"";
  const token=String(formData.get("bootstrapToken")||"");
  if(!expected||!token||!safeTokenEqual(token,expected))redirect("/admin/setup?error=token");

  const username=String(formData.get("username")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  const confirmation=String(formData.get("confirmation")||"");
  if(!/^[a-z0-9._-]{3,40}$/.test(username))redirect("/admin/setup?error=user");
  if(password!==confirmation)redirect("/admin/setup?error=match");
  let passwordHash:string;
  try{passwordHash=await hashAdminPassword(password)}catch{redirect("/admin/setup?error=password")}

  let admin:{id:string;username:string;role:string}|null=null;
  try{
    admin=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK})`;
      if(await tx.adminUser.count({where:{role:"SUPERADMIN"}}))return null;
      const created=await tx.adminUser.create({data:{username,passwordHash,role:"SUPERADMIN",active:true}});
      await tx.adminAuditLog.create({data:{actorId:created.id,action:"ADMIN_BOOTSTRAP",targetType:"AdminUser",targetId:created.id,details:{username:created.username}}});
      return {id:created.id,username:created.username,role:created.role};
    });
  }catch{redirect("/admin/setup?error=create")}
  if(!admin)redirect("/admin/login");
  await createAdminSession(admin);
  redirect("/admin");
}
