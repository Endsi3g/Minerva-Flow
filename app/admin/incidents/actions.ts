"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createIncident, type CreateIncidentInput } from "@/lib/data/incidents";

export async function createIncidentAction(input: CreateIncidentInput): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!input.title.trim() || !input.description.trim()) return false;

  const ok = await createIncident(input);
  if (ok) revalidatePath("/admin/incidents");
  return ok;
}
