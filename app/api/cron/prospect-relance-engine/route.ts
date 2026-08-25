import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProspectRelanceEmail } from "@/lib/email/prospect-mailer";
import type { Prospect } from "@/lib/prospects/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const autoSend = process.env.AUTO_SEND_RELANCES === "true";

  const { data: rows, error } = await admin
    .from("prospects")
    .select("*")
    .not("status", "in", '("converti","decline","rdv_fixe")');

  if (error || !rows) {
    return NextResponse.json({ error: "Erreur lecture prospects" }, { status: 500 });
  }

  const now = Date.now();
  const processed: {
    id: string;
    restaurantName: string;
    step: 1 | 2;
    daysSince: number;
    action: "sent_email" | "flagged_due" | "no_email";
    email?: string;
  }[] = [];

  for (const r of rows) {
    const lastContact = r.contacted_at ? new Date(r.contacted_at).getTime() : r.created_at ? new Date(r.created_at).getTime() : null;
    if (!lastContact) continue;

    const daysSince = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));
    let step: 1 | 2 | null = null;

    if ((r.status === "audit_envoye" || r.status === "contacte") && daysSince >= 2) {
      step = 1;
    } else if (r.status === "relance_1" && daysSince >= 3) {
      step = 2;
    }

    if (!step) continue;

    // Extract email from notes if present
    let recipientEmail: string | null = null;
    if (r.notes) {
      const match = r.notes.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) recipientEmail = match[0];
    }

    if (autoSend && recipientEmail) {
      const prospect: Prospect = {
        id: r.id,
        sourceUrl: r.source_url,
        sourcePlatform: r.source_platform,
        restaurantName: r.restaurant_name,
        currency: r.currency,
        detectedAddress: r.detected_address,
        commissionRatePct: Number(r.commission_rate_pct),
        assumedMonthlyOrders: r.assumed_monthly_orders,
        status: r.status,
        demoSlug: r.demo_slug,
        menu: r.menu_json ?? { categories: [] },
        notes: r.notes,
        demoViewCount: r.demo_view_count,
        lastViewedAt: r.last_viewed_at,
        contactedAt: r.contacted_at,
        auditReport: r.audit_report,
        auditGeneratedAt: r.audit_generated_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      const sendRes = await sendProspectRelanceEmail({
        to: recipientEmail,
        prospect,
        step,
      });

      if (sendRes.ok) {
        const nextStatus = step === 1 ? "relance_1" : "relance_2";
        const nowIso = new Date().toISOString();
        const updatedNotes = [r.notes, `[${nowIso.slice(0, 10)}] Auto-relance ${step} envoyée par Cron à ${recipientEmail}`]
          .filter(Boolean)
          .join("\n");

        await admin
          .from("prospects")
          .update({
            status: nextStatus,
            contacted_at: nowIso,
            notes: updatedNotes,
            updated_at: nowIso,
          })
          .eq("id", r.id);

        processed.push({ id: r.id, restaurantName: r.restaurant_name, step, daysSince, action: "sent_email", email: recipientEmail });
        continue;
      }
    }

    processed.push({
      id: r.id,
      restaurantName: r.restaurant_name,
      step,
      daysSince,
      action: recipientEmail ? "flagged_due" : "no_email",
      email: recipientEmail ?? undefined,
    });
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    autoSendEnabled: autoSend,
    totalDue: processed.length,
    processed,
  });
}
