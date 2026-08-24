"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapTransaction, type CustomerRow, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { sendRetentionNudge, type RetentionTrigger } from "@/lib/retention/send";

/**
 * The owner-initiated counterpart to the daily retention cron: same
 * message, same channel fallback, same customer_retention_sends log (so
 * the cron's frequency cap also respects a manual nudge) — just triggered
 * by a click on /impact instead of waiting for tomorrow's run.
 */
export async function sendManualRetentionNudgeAction(
  customerId: string,
  trigger: RetentionTrigger
): Promise<{ ok: boolean; channel: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, channel: null };

  const admin = createAdminClient();

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", membership.restaurantId)
    .maybeSingle();
  if (!restaurantRow) return { ok: false, channel: null };

  const { data: customerRow } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("restaurant_id", membership.restaurantId)
    .eq("marketing_consent", true)
    .maybeSingle();
  if (!customerRow) return { ok: false, channel: null };

  const { data: txRows } = await admin.from("loyalty_transactions").select("*").eq("customer_id", customerId);
  const customer = mapCustomer(
    customerRow as CustomerRow,
    ((txRows as LoyaltyTransactionRow[]) ?? []).map(mapTransaction)
  );

  const channel = await sendRetentionNudge(admin, membership.restaurantId, restaurantRow.name, customer, trigger);
  if (channel) revalidatePath("/impact");
  return { ok: Boolean(channel), channel };
}
