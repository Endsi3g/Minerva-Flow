import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Restaurant discovery for the native app's "nearby" map — deliberately
 * NOT scoped to the caller's own restaurant (see /api/portal/restaurant
 * for that), this lists every restaurant so a customer can find and join
 * new ones. Requires only a valid authenticated user (resolveNativeUserId,
 * not resolveNativeCustomer) since discovering a restaurant you are not
 * yet a loyalty customer of is the entire point.
 *
 * Explicit column allowlist via the admin client, same reason as
 * /api/portal/restaurant: `restaurants` also holds
 * stripe_connect_account_id and break-even/financial-planning columns
 * that must never reach a customer's device, and there is no RLS policy
 * that could safely be added here for a non-member to read the raw table.
 */
export async function GET(req: Request) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("id, name, description, address, city, province, lat, lng, phone, website, color, opening_hours, service_model, image_urls, google_maps_url")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) {
    return NextResponse.json({ error: "Impossible de charger les restaurants" }, { status: 500 });
  }

  return NextResponse.json({
    restaurants: (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string | null,
      address: r.address as string | null,
      city: r.city as string | null,
      province: r.province as string | null,
      lat: r.lat as number,
      lng: r.lng as number,
      phone: r.phone as string | null,
      website: r.website as string | null,
      color: r.color as string | null,
      openingHours: r.opening_hours,
      serviceModel: (r.service_model as string | null) ?? "restaurant",
      imageUrls: (r.image_urls as string[] | null) ?? [],
      googleMapsUrl: r.google_maps_url as string | null,
    })),
  });
}
