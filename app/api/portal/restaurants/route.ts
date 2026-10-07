import { NextResponse } from "next/server";
import { resolveNativeUserContext } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every customer-owned restaurant relationship for the authenticated
 * caller. Customer rows are queried with the caller's own access token and
 * customers_select_own RLS policy. Restaurant names are fetched afterward
 * with a narrow projection, using only IDs proven to belong to that caller.
 * This avoids returning any restaurant billing or financial columns.
 */
export async function GET(req: Request) {
  const verified = await resolveNativeUserContext(req);
  if (!verified) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { client, userId } = verified;
  const { data: customers, error: customersError } = await client
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
  // A loyalty customer may not have a restaurant_members row, so RLS can
  // legitimately hide restaurant metadata here. Use names only where the
  // caller's own policies permit them and keep a neutral fallback otherwise.
  const { data: restaurants, error: restaurantsError } = await createAdminClient()
    .from("restaurants")
    .select("id, name")
    .in("id", restaurantIds);
  if (restaurantsError) {
    return NextResponse.json({ error: "Impossible de charger les noms de vos restaurants" }, { status: 503 });
  }
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
