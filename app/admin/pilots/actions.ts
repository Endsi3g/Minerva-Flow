"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { updatePilotRequestStatus, type PilotRequest } from "@/lib/data/pilot-requests";

export async function updatePilotRequestStatusAction(
  id: string,
  status: PilotRequest["status"]
): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const ok = await updatePilotRequestStatus(id, status);
  if (ok) revalidatePath("/admin/pilots");
  return ok;
}
