import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bridge for the handful of restaurant-level fields the native app's Home
 * and Profile tabs need (display name, loyalty tier thresholds) — there is
 * no RLS SELECT policy on `restaurants` for a loyalty customer (only
 * is_restaurant_member/is_workspace_member), and there never should be one
 * added at the row level: the table also holds stripe_connect_account_id
 * and break-even/financial-planning columns that must never reach a
 * customer's device. This explicitly selects only the customer-safe
 * columns via the admin client, the same pattern as the menu/referrals
 * bridges.
 *
 * Fixes a real bug: SupabaseManager.loadPortalData() previously read
 * `restaurants` directly with the token-scoped client, which RLS silently
 * blocked — restaurantName has been null in the native app the whole time.
 */
export async function GET(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("name, loyalty_tier_2_threshold, loyalty_tier_3_threshold")
    .eq("id", customer.restaurantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    name: data.name as string,
    loyaltyTier2Threshold: (data.loyalty_tier_2_threshold as number | null) ?? 150,
    loyaltyTier3Threshold: (data.loyalty_tier_3_threshold as number | null) ?? 400,
  });
}
