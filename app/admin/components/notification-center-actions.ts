"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

export async function markAdminNotificationRead(formData:FormData){
  const session=await requireAdmin();
  const notificationId=String(formData.get("notificationId")||"");
  if(!notificationId)return;
  const exists=await prisma.notificationMessage.findFirst({
    where:{id:notificationId,channel:"IN_APP",status:{not:"CANCELLED"}},
    select:{id:true}
  });
  if(!exists)return;
  await prisma.adminNotificationRead.upsert({
    where:{adminUserId_notificationId:{adminUserId:session.userId,notificationId}},
    create:{adminUserId:session.userId,notificationId},
    update:{readAt:new Date()}
  });
  revalidatePath("/admin");
}

export async function markAllAdminNotificationsRead(){
  const session=await requireAdmin();
  const messages=await prisma.notificationMessage.findMany({
    where:{channel:"IN_APP",status:{not:"CANCELLED"}},
    select:{id:true},
    orderBy:{createdAt:"desc"},
    take:100
  });
  if(!messages.length)return;
  await prisma.$transaction(messages.map(message=>prisma.adminNotificationRead.upsert({
    where:{adminUserId_notificationId:{adminUserId:session.userId,notificationId:message.id}},
    create:{adminUserId:session.userId,notificationId:message.id},
    update:{readAt:new Date()}
  })));
  revalidatePath("/admin");
}
