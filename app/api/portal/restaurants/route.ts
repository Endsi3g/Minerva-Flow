import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every restaurant relationship the caller has, with the restaurant's own
 * display name attached — a customer can legitimately be a loyalty member
 * at more than one participating restaurant under the same email (same
 * multi-restaurant reality the web portal's own chooser already handles,
 * see getCustomersForUser), and the native app previously only ever
 * surfaced the first one. `customers` rows are directly RLS-readable by
 * their own owner, but `restaurants` is not (see /api/portal/restaurant's
 * own comment on why — stripe_connect_account_id, financial planning
 * columns), so this bridge exists specifically to attach a safe restaurant
 * name to each membership without exposing anything else about it.
 */
export async function GET(req: Request) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: customers, error: customersError } = await admin
    .from("customers")
    .select("id, restaurant_id, visit_count, total_spent, loyalty_points")
    .eq("user_id", userId);

  if (customersError) {
    return NextResponse.json({ error: "Impossible de charger vos comptes fidélité" }, { status: 500 });
  }
  if (!customers || customers.length === 0) {
    return NextResponse.json({ memberships: [] });
  }

  const restaurantIds = [...new Set(customers.map((c) => c.restaurant_id as string))];
  const { data: restaurants } = await admin.from("restaurants").select("id, name").in("id", restaurantIds);
  const nameById = new Map((restaurants ?? []).map((r) => [r.id as string, r.name as string]));

  return NextResponse.json({
    memberships: customers.map((c) => ({
      customerId: c.id as string,
      restaurantId: c.restaurant_id as string,
      restaurantName: nameById.get(c.restaurant_id as string) ?? "Restaurant",
      visitCount: c.visit_count as number,
      totalSpent: c.total_spent as number,
      loyaltyPoints: c.loyalty_points as number,
    })),
  });
}
