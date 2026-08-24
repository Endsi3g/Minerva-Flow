import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { mapCustomer, mapTransaction, type CustomerRow, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { getInactiveCustomers, getUpcomingBirthdays, getDriftingHighValueCustomers } from "@/lib/engine/retention";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import type { Customer } from "@/lib/types";

type Trigger = "inactivity" | "birthday" | "value_drift";
type Channel = "email" | "push" | "sms";

function buildMessage(trigger: Trigger, restaurantName: string, customerName: string) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const p = (text: string) =>
    `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${text}</p>`;

  switch (trigger) {
    case "inactivity":
      return {
        subject: `${firstName}, votre table vous attend chez ${restaurantName}`,
        bodyHtml: p(`Bonjour ${firstName},`) + p(`Ça fait un moment qu'on ne vous a pas vu chez ${restaurantName} — votre plat préféré vous attend. Passez nous voir bientôt !`),
        smsBody: `${restaurantName} : ${firstName}, ça fait un moment ! Revenez nous voir bientôt.`,
        pushTitle: `${restaurantName} vous attend`,
        pushBody: `Ça fait un moment, ${firstName} — revenez nous voir !`,
      };
    case "birthday":
      return {
        subject: `Joyeux anniversaire ${firstName} — un cadeau vous attend chez ${restaurantName}`,
        bodyHtml: p(`Joyeux anniversaire, ${firstName} !`) + p(`Toute l'équipe de ${restaurantName} vous souhaite une belle journée — passez nous voir, on a une surprise pour vous.`),
        smsBody: `${restaurantName} : Joyeux anniversaire ${firstName} ! Une surprise vous attend en salle.`,
        pushTitle: `Joyeux anniversaire ${firstName}`,
        pushBody: `${restaurantName} a une surprise pour vous.`,
      };
    case "value_drift":
      return {
        subject: `${firstName}, on s'ennuie de vous chez ${restaurantName}`,
        bodyHtml: p(`Bonjour ${firstName},`) + p(`Vous êtes l'un de nos clients les plus fidèles et on remarque que vos visites se sont espacées. On serait ravis de vous revoir bientôt.`),
        smsBody: `${restaurantName} : ${firstName}, on s'ennuie de vous ! Revenez nous voir bientôt.`,
        pushTitle: `On s'ennuie de vous, ${firstName}`,
        pushBody: `${restaurantName} aimerait vous revoir bientôt.`,
      };
  }
}

/**
 * Runs once a day (see vercel.json). Protected by CRON_SECRET, same pattern
 * as every other /api/cron/* route — uses the admin client throughout since
 * a cron invocation has no user session, so the RLS-scoped lib/data/*.ts
 * getters (which assume a signed-in user) can't be reused here; the row
 * mappers (mapCustomer/mapTransaction) are pure functions so they're
 * reused directly against admin-fetched rows instead.
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
      const { data: recentSends } = await admin
        .from("customer_retention_sends")
        .select("customer_id")
        .eq("restaurant_id", restaurantId)
        .gte("sent_at", capCutoff);
      const recentlyContacted = new Set((recentSends ?? []).map((r) => r.customer_id as string));

      const eligible = (list: Customer[]) => list.filter((c) => !recentlyContacted.has(c.id));

      // Priority: birthday (warmest occasion) overrides value_drift, which
      // overrides plain inactivity — one message per customer per run.
      const targets = new Map<string, { customer: Customer; trigger: Trigger }>();
      for (const c of eligible(getInactiveCustomers(mapped, restaurantRow.retention_inactivity_days))) {
        targets.set(c.id, { customer: c, trigger: "inactivity" });
      }
      for (const c of eligible(getDriftingHighValueCustomers(mapped))) {
        targets.set(c.id, { customer: c, trigger: "value_drift" });
      }
      for (const c of eligible(getUpcomingBirthdays(mapped, restaurantRow.retention_birthday_lead_days))) {
        targets.set(c.id, { customer: c, trigger: "birthday" });
      }

      let sentCount = 0;
      for (const { customer, trigger } of targets.values()) {
        const msg = buildMessage(trigger, restaurantRow.name, customer.name);
        let channel: Channel | null = null;

        if (customer.email) {
          const result = await sendRetentionEmail({ to: customer.email, subject: msg.subject, bodyHtml: msg.bodyHtml });
          if (result.ok) channel = "email";
        }
        if (!channel && customer.userId) {
          await sendPushToUsers([customer.userId], { title: msg.pushTitle, body: msg.pushBody, link: "/portal" }, restaurantId);
          channel = "push";
        }
        if (!channel && isSmsConfigured() && customer.phone) {
          const ok = await sendSms(customer.phone, msg.smsBody);
          if (ok) channel = "sms";
        }

        if (channel) {
          await admin
            .from("customer_retention_sends")
            .insert({ restaurant_id: restaurantId, customer_id: customer.id, trigger_type: trigger, channel });
          sentCount++;
        }
      }

      return { restaurantId, sent: sentCount };
    })
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), results: results.filter((r) => r.sent > 0) });
}
