"use server";

import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransaction } from "@/lib/data/finance";
import { createExpenseShare } from "@/lib/data/expense-shares";
import { createClient } from "@/lib/supabase/server";

export async function createExpenseShareLinkAction(transactionId: string): Promise<string | null> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return null;

  const transaction = await getFinancialTransaction(restaurantId, transactionId);
  if (!transaction) return null;

  const supabase = await createClient();
  let createdByName: string | null = null;
  if (transaction.createdBy) {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", transaction.createdBy).maybeSingle();
    createdByName = data?.full_name ?? null;
  }

  const { data: restaurant } = await supabase.from("restaurants").select("name").eq("id", restaurantId).maybeSingle();

  return createExpenseShare(restaurantId, transactionId, {
    restaurantName: restaurant?.name ?? "",
    transaction,
    createdByName,
  });
}
