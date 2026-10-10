import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { mapCustomer, mapTransaction, type CustomerRow, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { getInactiveCustomers, getUpcomingBirthdays, getDriftingHighValueCustomers } from "@/lib/engine/retention";
import { sendRetentionNudge, type RetentionTrigger } from "@/lib/retention/send";
import type { Customer } from "@/lib/types";
import { isFrequentEligible } from "@/lib/retention/frequent";

type Trigger = RetentionTrigger;

/**
 * Runs once a day (see vercel.json). Protected by CRON_SECRET, same pattern
 * as every other /api/cron/* route — uses the admin client throughout since
 * a cron invocation has no user session, so the RLS-scoped lib/data/*.ts
 * getters (which assume a signed-in user) can't be reused here; the row
 * mappers (mapCustomer/mapTransaction) are pure functions so they're
 * reused directly against admin-fetched rows instead.
 *
 * Customers on the opt-in "Fréquent" level get push only, at most twice a day,
 * 4 h apart, 9:00-20:00 Montréal (isWithinSendingHours).
 *
 * Per restaurant with retention_engine_enabled: only customers with
 * marketing_consent = true are ever considered (CASL) — never targets
 * inactivity/birthday/drift for someone who hasn't opted in, no exceptions.
 * One message per customer per run, at most one already-tried channel
 * (email → push → SMS, first one that succeeds/attempts wins) — never all
 * three for the same nudge. A customer already contacted within
 * retention_frequency_cap_days is skipped entirely.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const restaurantIds = await getAllActiveRestaurantIds();

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const { data: restaurantRow } = await admin
        .from("restaurants")
        .select(
          "name, retention_engine_enabled, retention_inactivity_days, retention_frequency_cap_days, retention_birthday_lead_days"
        )
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

      const capCutoff = new Date(
        Date.now() - restaurantRow.retention_frequency_cap_days * 86_400_000
      ).toISOString();
      // Frequent customers are judged on the last 24 h instead of the restaurant's cap.
      const dayCutoff = new Date(Date.now() - 86_400_000).toISOString();
      const { data: recentSends } = await admin
        .from("customer_retention_sends")
        .select("customer_id, sent_at")
        .eq("restaurant_id", restaurantId)
        .gte("sent_at", dayCutoff < capCutoff ? dayCutoff : capCutoff);
      const sendsByCustomer = new Map<string, string[]>();
      for (const row of (recentSends ?? []) as { customer_id: string; sent_at: string }[]) {
        const list = sendsByCustomer.get(row.customer_id) ?? [];
        list.push(row.sent_at);
        sendsByCustomer.set(row.customer_id, list);
      }
      const now = new Date();
      const recentlyContacted = new Set(
        [...sendsByCustomer.entries()].filter(([, times]) => times.some((time) => time >= capCutoff)).map(([id]) => id)
      );

      // Default cadence: the restaurant's cap in days. "Fréquent" (opt-in): a
      // daily cap, a minimum gap and sending hours instead (lib/retention/frequent.ts).
      const eligible = (list: Customer[]) =>
        list.filter((c) =>
          c.notificationFrequency === "frequent"
            ? isFrequentEligible(sendsByCustomer.get(c.id) ?? [], now)
            : !recentlyContacted.has(c.id)
        );
      // Routine nudges (inactivity, value_drift) respect the customer's own
      // "important_only" preference; occasion-based ones (birthday,
      // reward_available) are never routine enough to skip.
      const eligibleRoutine = (list: Customer[]) => eligible(list).filter((c) => c.notificationFrequency !== "important_only");

      const { data: cheapestReward } = await admin
        .from("loyalty_rewards")
        .select("name, points_cost")
        .eq("restaurant_id", restaurantId)
        .eq("active", true)
        .order("points_cost", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Priority: birthday (warmest occasion) overrides value_drift, which
      // overrides plain inactivity, which overrides a reward-available nudge
      // (the mildest reason to reach out) — one message per customer per run.
      const targets = new Map<string, { customer: Customer; trigger: Trigger; extra?: { points: number; rewardName: string } }>();
      if (cheapestReward) {
        for (const c of eligible(mapped.filter((c) => c.loyaltyPoints >= cheapestReward.points_cost))) {
          targets.set(c.id, {
            customer: c,
            trigger: "reward_available",
            extra: { points: c.loyaltyPoints, rewardName: cheapestReward.name },
          });
        }
      }
      for (const c of eligibleRoutine(getInactiveCustomers(mapped, restaurantRow.retention_inactivity_days))) {
        targets.set(c.id, { customer: c, trigger: "inactivity" });
      }
      for (const c of eligibleRoutine(getDriftingHighValueCustomers(mapped))) {
        targets.set(c.id, { customer: c, trigger: "value_drift" });
      }
      for (const c of eligible(getUpcomingBirthdays(mapped, restaurantRow.retention_birthday_lead_days))) {
        targets.set(c.id, { customer: c, trigger: "birthday" });
      }

      let sentCount = 0;
      for (const { customer, trigger, extra } of targets.values()) {
        const channel = await sendRetentionNudge(admin, restaurantId, restaurantRow.name, customer, trigger, extra, {
          frequent: customer.notificationFrequency === "frequent",
          now,
        });
        if (channel) sentCount++;
      }

      return { restaurantId, sent: sentCount };
    })
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), results: results.filter((r) => r.sent > 0) });
}
