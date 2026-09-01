"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapTransaction, type CustomerRow, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { sendRetentionNudge, type RetentionTrigger } from "@/lib/retention/send";
import { notifyRestaurant } from "@/lib/data/notifications";
import { formatCurrency } from "@/lib/utils";

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

/**
 * "Partager avec l'équipe" on /impact — there was no way to surface these
 * numbers to teammates short of screenshotting the page. Reuses the same
 * in-app/push notification fan-out every other team-wide event already
 * goes through (order.created, etc.) rather than a new external-link
 * mechanism: the audience is teammates who already have accounts, not
 * outsiders, so a deep link back to /impact is enough.
 */
export async function shareImpactResultsAction(
  incrementalRevenue: number,
  note: string
): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const sharerName = (profile as { full_name: string | null } | null)?.full_name ?? "Un collègue";

  await notifyRestaurant({
    restaurantId: membership.restaurantId,
    type: "impact.shared",
    title: `${sharerName} a partagé les résultats de fidélisation`,
    body: note.trim()
      ? note.trim()
      : `${formatCurrency(incrementalRevenue)} de ventes générées ce mois-ci grâce à la fidélisation.`,
    link: "/impact",
    excludeUserId: user.id,
  });

  return true;
}
