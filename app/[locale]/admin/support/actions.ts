"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin, replySupportRequest } from "@/lib/data/admin";

export async function replySupportRequestAction(
  id: string,
  reply: string,
  status: "en_cours" | "resolu"
): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!reply.trim()) return false;

  const ok = await replySupportRequest(id, reply, status);
  if (ok) revalidatePath("/admin/support");
  return ok;
}
