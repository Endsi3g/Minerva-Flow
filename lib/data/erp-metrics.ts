import { createClient } from "@/lib/supabase/server";

export type ErpMoneyMetrics = {
  periodDays: number;
  totalRevenue: number;
  pointsRedeemed: number;
  moneyDistributed: number;
  moneyRetained: number;
  pairingCodesResolved: number;
  visitsViaPairingCode: number;
  pointsViaPairingCode: number;
  revenueViaPairingCode: number;
};

type LoyaltyTransactionRow = {
  type: "visite" | "ajustement" | "echange";
  amount_spent: number | null;
  points_delta: number;
  via_pairing_code: boolean;
};

/**
 * "Argent distribué" / "Argent conservé" are an estimate, not a real
 * accounting ledger: distributed = the dollar-equivalent cost of points
 * redeemed this period (points ÷ loyalty_points_per_dollar), retained =
 * revenue logged via loyalty visits minus that. Surfaced with that caveat
 * in the UI rather than presented as exact figures.
 */
export async function getErpMoneyMetrics(restaurantId: string, periodDays = 30): Promise<ErpMoneyMetrics> {
  const supabase = await createClient();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: restaurant }, { data: transactions }, { data: resolvedCount }] = await Promise.all([
    supabase.from("restaurants").select("loyalty_points_per_dollar").eq("id", restaurantId).maybeSingle(),
    supabase
      .from("loyalty_transactions")
      .select("type, amount_spent, points_delta, via_pairing_code")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since),
    supabase.rpc("get_pairing_code_resolved_count", { p_restaurant_id: restaurantId, p_since: since }),
  ]);

  const rate = (restaurant as { loyalty_points_per_dollar: number } | null)?.loyalty_points_per_dollar || 1;
  const rows = (transactions ?? []) as LoyaltyTransactionRow[];

  const totalRevenue = rows.filter((r) => r.type === "visite").reduce((sum, r) => sum + (r.amount_spent ?? 0), 0);
  const pointsRedeemed = rows.filter((r) => r.type === "echange").reduce((sum, r) => sum + Math.abs(r.points_delta), 0);
  const moneyDistributed = pointsRedeemed / rate;
  const moneyRetained = totalRevenue - moneyDistributed;

  const viaPairing = rows.filter((r) => r.type === "visite" && r.via_pairing_code);

  return {
    periodDays,
    totalRevenue,
    pointsRedeemed,
    moneyDistributed,
    moneyRetained,
    pairingCodesResolved: (resolvedCount as number | null) ?? 0,
    visitsViaPairingCode: viaPairing.length,
    pointsViaPairingCode: viaPairing.reduce((sum, r) => sum + r.points_delta, 0),
    revenueViaPairingCode: viaPairing.reduce((sum, r) => sum + (r.amount_spent ?? 0), 0),
  };
}
