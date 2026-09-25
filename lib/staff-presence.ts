import "server-only";
import {prisma} from "./prisma";

export async function openStaffPresence(userId:string){
  if(!userId)return null;

  return prisma.$transaction(async tx=>{
    const now=new Date();
    const changed=await tx.adminUser.updateMany({
      where:{id:userId,onDuty:false},
      data:{onDuty:true,onDutySince:now}
    });

    const user=await tx.adminUser.findUnique({
      where:{id:userId},
      select:{id:true,username:true,onDuty:true,onDutySince:true}
    });

    if(changed.count>0){
      await tx.adminAuditLog.create({
        data:{
          actorId:userId,
          action:"STAFF_PRESENCE_STARTED",
          targetType:"AdminUser",
          targetId:userId,
          details:{startedAt:now.toISOString()}
        }
      });
    }

    return user;
  });
}

export async function closeStaffPresence(userId:string,reason="MANUAL"){
  if(!userId)return null;

  return prisma.$transaction(async tx=>{
    const before=await tx.adminUser.findUnique({
      where:{id:userId},
      select:{id:true,username:true,onDuty:true,onDutySince:true}
    });
    if(!before||!before.onDuty)return before;

    const now=new Date();
    const changed=await tx.adminUser.updateMany({
      where:{id:userId,onDuty:true},
      data:{onDuty:false,onDutySince:null}
    });

    if(changed.count>0){
      const durationMinutes=before.onDutySince
        ?Math.max(0,Math.round((now.getTime()-before.onDutySince.getTime())/60000))
        :0;

      await tx.adminAuditLog.create({
        data:{
          actorId:userId,
          action:"STAFF_PRESENCE_ENDED",
          targetType:"AdminUser",
          targetId:userId,
          details:{
            startedAt:before.onDutySince?.toISOString()||null,
            endedAt:now.toISOString(),
            durationMinutes,
            reason
          }
        }
      });
    }

    return tx.adminUser.findUnique({
      where:{id:userId},
      select:{id:true,username:true,onDuty:true,onDutySince:true}
    });
  });
}
