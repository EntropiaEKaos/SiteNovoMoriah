"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {closeStaffPresence,openStaffPresence} from "../../../lib/staff-presence";
export async function startPresence(){const session=await requireAdmin();await openStaffPresence(session.userId);revalidatePath("/admin");revalidatePath("/admin/presenca")}
export async function endPresence(){const session=await requireAdmin();await closeStaffPresence(session.userId,"MANUAL");revalidatePath("/admin");revalidatePath("/admin/presenca")}
