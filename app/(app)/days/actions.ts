"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createServiceDay, type ServiceDayInput } from "@/lib/data/service-days";
import type { ServiceDay } from "@/lib/types";

export type CreateServiceDayResult =
  | { ok: true; day: ServiceDay }
  | { ok: false; error: string };

/**
 * Server Action backing the "ajouter une journée" form on /days. Resolves
 * the restaurant and role from the session (never trusts a client-supplied
 * restaurantId), upserts the service_days row, and logs the activity.
 */
export async function createServiceDayAction(
  input: ServiceDayInput
): Promise<CreateServiceDayResult> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { ok: false, error: "Vous devez être connecté et rattaché à un restaurant." };
  }
  if (membership.role !== "owner" && membership.role !== "staff") {
    return { ok: false, error: "Vous n'avez pas les droits pour ajouter une journée." };
  }
  if (!input.date || !Number.isFinite(input.revenue)) {
    return { ok: false, error: "La date et le revenu sont requis." };
  }

  const day = await createServiceDay(membership.restaurantId, input);
  if (!day) {
    return { ok: false, error: "Impossible d'enregistrer la journée. Réessayez." };
  }

  revalidatePath("/days");
  revalidatePath("/overview");

  return { ok: true, day };
}
