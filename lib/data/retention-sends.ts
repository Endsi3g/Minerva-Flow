import { createClient } from "@/lib/supabase/server";

export type RetentionSend = { customerId: string; sentAt: string };

/**
 * Retention-engine sends logged for this restaurant — see
 * app/api/cron/retention-engine. Omit `range` for all-time (used by the
 * Impact LTV dashboard's touched/untouched segmentation, which has no
 * natural date window).
 */
export async function getRetentionSends(
  restaurantId: string,
  range?: { from: string; to: string }
): Promise<RetentionSend[]> {
  const supabase = await createClient();
  let query = supabase.from("customer_retention_sends").select("customer_id, sent_at").eq("restaurant_id", restaurantId);
  if (range) query = query.gte("sent_at", range.from).lte("sent_at", range.to);
  const { data, error } = await query;

  if (error || !data) return [];
  return (data as { customer_id: string; sent_at: string }[]).map((r) => ({
    customerId: r.customer_id,
    sentAt: r.sent_at,
  }));
}
