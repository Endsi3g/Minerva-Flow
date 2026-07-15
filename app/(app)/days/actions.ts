"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import {
  createServiceDay,
  updateServiceDay,
  deleteServiceDay,
  bulkImportServiceDays,
  type ServiceDayInput,
} from "@/lib/data/service-days";
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

export async function updateServiceDayAction(
  id: string,
  patch: Partial<ServiceDayInput>
): Promise<CreateServiceDayResult> {
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, error: "Vous devez être connecté et rattaché à un restaurant." };
  if (membership.role !== "owner" && membership.role !== "staff") {
    return { ok: false, error: "Vous n'avez pas les droits pour modifier une journée." };
  }

  const day = await updateServiceDay(membership.restaurantId, id, patch);
  if (!day) return { ok: false, error: "Impossible de modifier la journée. Réessayez." };

  revalidatePath("/days");
  revalidatePath("/overview");
  return { ok: true, day };
}

export async function deleteServiceDayAction(id: string): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership) return false;
  if (membership.role !== "owner" && membership.role !== "staff") return false;

  const ok = await deleteServiceDay(membership.restaurantId, id);
  if (ok) {
    revalidatePath("/days");
    revalidatePath("/overview");
  }
  return ok;
}

/**
 * Bulk import backing the "importer un historique" flow on /days — same
 * authorization rules as a single entry, applied once to the whole batch.
 */
export async function importServiceDaysAction(inputs: ServiceDayInput[]): Promise<number> {
  const membership = await getCurrentMembership();
  if (!membership) return 0;
  if (membership.role !== "owner" && membership.role !== "staff") return 0;
  if (inputs.length === 0) return 0;

  const count = await bulkImportServiceDays(membership.restaurantId, inputs);

  if (count > 0) {
    revalidatePath("/days");
    revalidatePath("/overview");
  }

  return count;
}
