"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {prisma} from "../../../lib/prisma";

export async function updateMediaMetadata(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Mídia inválida.");

  const alt=String(formData.get("alt")||"").trim().slice(0,300)||null;
  const label=String(formData.get("label")||"").trim().slice(0,160)||null;
  const folder=String(formData.get("folder")||"").trim().slice(0,80)||null;
  const rawOrder=Number(formData.get("sortOrder")||0);
  const sortOrder=Number.isFinite(rawOrder)?Math.max(-9999,Math.min(9999,Math.round(rawOrder))):0;

  await prisma.media.update({
    where:{id},
    data:{alt,label,folder,sortOrder}
  });

  revalidatePath("/admin/galeria");
  revalidatePath("/admin/midia");
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function bulkAssignMediaFolder(formData:FormData){
  await requireAdmin();
  const ids=formData.getAll("mediaId").map(value=>String(value)).filter(Boolean).slice(0,200);
  const folder=String(formData.get("folder")||"").trim().slice(0,80)||null;
  if(!ids.length)throw new Error("Selecione pelo menos uma mídia.");

  await prisma.media.updateMany({
    where:{id:{in:ids}},
    data:{folder}
  });

  revalidatePath("/admin/galeria");
  revalidatePath("/admin/midia");
}
