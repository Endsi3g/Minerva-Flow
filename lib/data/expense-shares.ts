import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FinancialTransaction } from "@/lib/types";

export type ExpenseShareSnapshot = {
  restaurantName: string;
  transaction: FinancialTransaction;
  createdByName: string | null;
};

export type ExpenseShare = {
  token: string;
  createdAt: string;
  snapshot: ExpenseShareSnapshot;
};

export async function createExpenseShare(
  restaurantId: string,
  transactionId: string,
  snapshot: ExpenseShareSnapshot
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const token = randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("expense_shares").insert({
    restaurant_id: restaurantId,
    transaction_id: transactionId,
    token,
    snapshot,
    created_by: user.id,
  });
  if (error) return null;

  return token;
}

export async function getExpenseShareByToken(token: string): Promise<ExpenseShare | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("expense_shares")
    .select("token, snapshot, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  return {
    token: data.token,
    createdAt: data.created_at,
    snapshot: data.snapshot as ExpenseShareSnapshot,
  };
}
