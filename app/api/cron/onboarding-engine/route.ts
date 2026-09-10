import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { mapCustomer, mapTransaction, type CustomerRow, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { getOnboardingDripTargets } from "@/lib/engine/retention";
import { sendRetentionNudge } from "@/lib/retention/send";
import type { Customer } from "@/lib/types";

/**
 * Runs once a day, just before retention-engine (see vercel.json) so its
 * sends are already logged in customer_retention_sends by the time that
 * cron's cap-check queries the same table — retention-engine needs no
 * changes to skip a customer this cron already touched today.
 *
 * Gated by the same retention_engine_enabled toggle as retention-engine
 * (no separate opt-in) and the same marketing_consent = true filter
 * (CASL) — but deliberately does NOT use retention_frequency_cap_days:
 * see getOnboardingDripTargets for why this drip needs its own cadence.
 * Guards against double-touching a customer are: (1) per-stage
 * idempotency — never resend a stage this customer already received, and
 * (2) a same-day check against ANY retention send (general or onboarding)
 * so a customer never gets two messages on the same calendar day.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const restaurantIds = await getAllActiveRestaurantIds();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const { data: restaurantRow } = await admin
        .from("restaurants")
        .select("name, retention_engine_enabled")
        .eq("id", restaurantId)
        .maybeSingle();
      if (!restaurantRow?.retention_engine_enabled) return { restaurantId, sent: 0 };

      const { data: customerRows } = await admin
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("marketing_consent", true);
      const customers = (customerRows ?? []) as CustomerRow[];
      if (customers.length === 0) return { restaurantId, sent: 0 };

      const { data: txRows } = await admin
        .from("loyalty_transactions")
        .select("*")
        .in("customer_id", customers.map((c) => c.id));
      const txByCustomer = new Map<string, LoyaltyTransactionRow[]>();
      for (const row of (txRows ?? []) as LoyaltyTransactionRow[]) {
        const list = txByCustomer.get(row.customer_id) ?? [];
        list.push(row);
        txByCustomer.set(row.customer_id, list);
      }
      const mapped: Customer[] = customers.map((row) =>
        mapCustomer(row, (txByCustomer.get(row.id) ?? []).map(mapTransaction))
      );

      const targets = getOnboardingDripTargets(mapped);
      if (targets.length === 0) return { restaurantId, sent: 0 };

      const [{ data: stageSends }, { data: todaySends }] = await Promise.all([
        admin
          .from("customer_retention_sends")
          .select("customer_id, trigger_type")
          .eq("restaurant_id", restaurantId)
          .in(
            "customer_id",
            targets.map((t) => t.customer.id)
          ),
        admin
          .from("customer_retention_sends")
          .select("customer_id")
          .eq("restaurant_id", restaurantId)
          .gte("sent_at", todayStart.toISOString()),
      ]);
      const alreadySentStage = new Set(
        (stageSends ?? []).map((r) => `${r.customer_id as string}:${r.trigger_type as string}`)
      );
      const touchedToday = new Set((todaySends ?? []).map((r) => r.customer_id as string));

      const { data: cheapestReward } = await admin
        .from("loyalty_rewards")
        .select("name, points_cost")
        .eq("restaurant_id", restaurantId)
        .eq("active", true)
        .order("points_cost", { ascending: true })
        .limit(1)
        .maybeSingle();

      let sentCount = 0;
      for (const { customer, stage } of targets) {
        if (touchedToday.has(customer.id) || alreadySentStage.has(`${customer.id}:${stage}`)) continue;
        // No active reward to tease means no sensible "à partir de 0 points" — skip this stage
        // for this restaurant rather than send a broken-looking message.
        if (stage === "onboarding_final" && !cheapestReward) continue;
        const extra = cheapestReward ? { points: cheapestReward.points_cost, rewardName: cheapestReward.name } : undefined;
        const channel = await sendRetentionNudge(admin, restaurantId, restaurantRow.name, customer, stage, extra);
        if (channel) sentCount++;
      }

      return { restaurantId, sent: sentCount };
    })
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), results: results.filter((r) => r.sent > 0) });
}
