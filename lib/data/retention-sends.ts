import { createClient } from "@/lib/supabase/server";

export type RetentionSend = { customerId: string; sentAt: string };

/** Retention-engine sends logged for this restaurant in a date range — see app/api/cron/retention-engine. */
export async function getRetentionSends(
  restaurantId: string,
  range: { from: string; to: string }
): Promise<RetentionSend[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_retention_sends")
    .select("customer_id, sent_at")
    .eq("restaurant_id", restaurantId)
    .gte("sent_at", range.from)
    .lte("sent_at", range.to);

  if (error || !data) return [];
  return (data as { customer_id: string; sent_at: string }[]).map((r) => ({
    customerId: r.customer_id,
    sentAt: r.sent_at,
  }));
}
