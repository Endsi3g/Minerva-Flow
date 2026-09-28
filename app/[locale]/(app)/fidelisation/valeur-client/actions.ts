"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";

export type AcquisitionCostCategory = "publicite" | "commissions" | "agence" | "promotions" | "equipement";

export async function addAcquisitionCostAction(input: {
  restaurantId: string;
  category: AcquisitionCostCategory;
  amount: number;
  spentOn: string;
  note?: string;
}): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (membership?.restaurantId !== input.restaurantId || !["owner", "manager"].includes(membership.role)) return false;
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.spentOn)) return false;

  const supabase = await createClient();
  const { error } = await supabase.from("customer_acquisition_costs").insert({
    restaurant_id: input.restaurantId,
    category: input.category,
    amount: Math.round(input.amount * 100) / 100,
    spent_on: input.spentOn,
    note: input.note?.trim().slice(0, 400) || null,
  });
  if (error) return false;
  revalidatePath("/fidelisation/valeur-client");
  return true;
}
