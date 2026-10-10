import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoyaltyTier, loyaltyTierLabel } from "@/lib/loyalty-tiers";
import { parseCustomerLanguage } from "@/lib/i18n/customer-language";
import { syncGoogleWalletBalance } from "@/lib/wallet/google-wallet-sync";

/**
 * Every 10 minutes (GitHub Actions, cron-wallet-sync.yml): pushes the current
 * balance to the Google Wallet pass of every customer whose points moved in
 * the last 20 minutes (visit credited, reward redeemed, adjustment). The
 * 20-minute window overlaps the schedule so one missed run loses nothing.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 20 * 60_000).toISOString();
  const { data: moved } = await admin.from("loyalty_transactions").select("customer_id").gte("created_at", since).limit(2000);
  const customerIds = [...new Set(((moved ?? []) as { customer_id: string }[]).map((row) => row.customer_id))].slice(0, 200);
  if (customerIds.length === 0) return NextResponse.json({ ranAt: new Date().toISOString(), customers: 0 });

  const { data: customers } = await admin
    .from("customers")
    .select("id, loyalty_points, total_spent, preferred_language, restaurants(loyalty_tier_2_threshold, loyalty_tier_3_threshold)")
    .in("id", customerIds);

  const counts = { updated: 0, not_saved: 0, skipped: 0, error: 0 };
  for (const customer of (customers ?? []) as unknown as Array<{
    id: string;
    loyalty_points: number | null;
    total_spent: number | null;
    preferred_language: string | null;
    restaurants: { loyalty_tier_2_threshold: number | null; loyalty_tier_3_threshold: number | null } | { loyalty_tier_2_threshold: number | null; loyalty_tier_3_threshold: number | null }[] | null;
  }>) {
    const restaurant = Array.isArray(customer.restaurants) ? customer.restaurants[0] : customer.restaurants;
    const tier = getLoyaltyTier(Number(customer.total_spent ?? 0), {
      tier2: restaurant?.loyalty_tier_2_threshold ?? 150,
      tier3: restaurant?.loyalty_tier_3_threshold ?? 400,
    });
    const language = parseCustomerLanguage(customer.preferred_language);
    const result = await syncGoogleWalletBalance({
      customerId: customer.id,
      points: Number(customer.loyalty_points ?? 0),
      tierLabel: loyaltyTierLabel[tier],
      language,
    });
    counts[result]++;
  }
  return NextResponse.json({ ranAt: new Date().toISOString(), customers: customerIds.length, ...counts });
}
