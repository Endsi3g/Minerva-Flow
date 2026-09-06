import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMenuItemsForCustomers } from "@/lib/data/menu";
import { getActiveOffersForRestaurant } from "@/lib/data/offers";

/**
 * A single restaurant's public-safe profile — reached from the discovery
 * map before someone is a loyalty customer there, so this deliberately
 * doesn't require an existing customers row (see /api/portal/discover's
 * own comment on why resolveNativeUserId, not resolveNativeCustomer).
 * Same explicit column allowlist as the list endpoint.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: restaurant, error: restaurantError }, offers, menuItems] = await Promise.all([
    admin
      .from("restaurants")
      .select("id, name, description, address, city, province, lat, lng, phone, website, color, opening_hours, service_model, image_urls")
      .eq("id", id)
      .single(),
    getActiveOffersForRestaurant(id),
    getActiveMenuItemsForCustomers(id),
  ]);

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    restaurant: {
      id: restaurant.id as string,
      name: restaurant.name as string,
      description: restaurant.description as string | null,
      address: restaurant.address as string | null,
      city: restaurant.city as string | null,
      province: restaurant.province as string | null,
      lat: restaurant.lat as number | null,
      lng: restaurant.lng as number | null,
      phone: restaurant.phone as string | null,
      website: restaurant.website as string | null,
      color: restaurant.color as string | null,
      openingHours: restaurant.opening_hours,
      serviceModel: (restaurant.service_model as string | null) ?? "restaurant",
      imageUrls: (restaurant.image_urls as string[] | null) ?? [],
    },
    offers: offers ?? [],
    menuItems,
  });
}
