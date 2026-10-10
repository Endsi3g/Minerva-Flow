import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReviewRequest } from "@/lib/orders/owner-updates";

/**
 * Every 10 minutes (GitHub Actions, see cron-order-review-requests.yml): asks
 * the customer for a Google review 30 minutes after their order became ready.
 * Orders older than 24 h are skipped so a backlog never produces stale asks.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data } = await admin
    .from("orders")
    .select("id, restaurant_id")
    .in("status", ["prete", "servie"])
    .is("review_requested_at", null)
    .lte("status_changed_at", new Date(now - 30 * 60_000).toISOString())
    .gte("status_changed_at", new Date(now - 24 * 3600_000).toISOString())
    .limit(200);

  const orders = (data ?? []) as { id: string; restaurant_id: string }[];
  let processed = 0;
  for (const order of orders) {
    try {
      if (await sendReviewRequest(order.restaurant_id, order.id)) processed++;
    } catch (error) {
      console.error("review request failed:", error);
    }
  }
  return NextResponse.json({ ranAt: new Date(now).toISOString(), processed });
}
