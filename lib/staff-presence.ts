import "server-only";
import {prisma} from "./prisma";
export async function openStaffPresence(userId:string){
  if(!userId)return null;
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"presence:"+userId}))`;
    const user=await tx.adminUser.findUnique({where:{id:userId},select:{id:true,username:true,onDuty:true,onDutySince:true}});
    if(!user||user.onDuty)return user;
    const now=new Date();
    await tx.adminUser.update({where:{id:userId},data:{onDuty:true,onDutySince:now}});
    await tx.adminAuditLog.create({data:{actorId:userId,action:"STAFF_PRESENCE_STARTED",targetType:"AdminUser",targetId:userId,details:{startedAt:now.toISOString()}}});
    return {...user,onDuty:true,onDutySince:now};
  });
}
export async function closeStaffPresence(userId:string,reason="MANUAL"){
  if(!userId)return null;
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"presence:"+userId}))`;
    const user=await tx.adminUser.findUnique({where:{id:userId},select:{id:true,username:true,onDuty:true,onDutySince:true}});
    if(!user||!user.onDuty)return user;
    const now=new Date();
    const durationMinutes=user.onDutySince?Math.max(0,Math.round((now.getTime()-user.onDutySince.getTime())/60000)):0;
    await tx.adminUser.update({where:{id:userId},data:{onDuty:false,onDutySince:null}});
    await tx.adminAuditLog.create({data:{actorId:userId,action:"STAFF_PRESENCE_ENDED",targetType:"AdminUser",targetId:userId,details:{startedAt:user.onDutySince?.toISOString()||null,endedAt:now.toISOString(),durationMinutes,reason}}});
    return {...user,onDuty:false,onDutySince:null};
  });
}
