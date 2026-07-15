import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Restaurant } from "@/lib/types";

/**
 * Free, no-key geocoding (OpenStreetMap Nominatim) so an establishment's
 * address turns into a map pin — best-effort, never blocks the save.
 * Nominatim's usage policy requires a descriptive User-Agent and no more
 * than ~1 req/s, both fine for this low-volume, on-save use.
 */
async function geocodeAddress(address: string, city: string, province?: string): Promise<{ lng: number; lat: number } | null> {
  const query = [address, city, province, "Canada"].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Minerva-Flow/1.0 (contact: quebecsaas@gmail.com)" },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as { lon: string; lat: string }[];
    const first = results[0];
    if (!first) return null;

    return { lng: Number(first.lon), lat: Number(first.lat) };
  } catch {
    return null;
  }
}

type RestaurantRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  timezone: string;
  currency: string;
  service_model: string;
  operating_days: number[] | null;
  color: string | null;
  lng: number | null;
  lat: number | null;
  company_id: string | null;
};

function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    province: row.province ?? "QC",
    postalCode: row.postal_code,
    timezone: row.timezone,
    currency: row.currency,
    serviceModel: row.service_model,
    operatingDays: row.operating_days ?? [],
    color: row.color ?? "var(--mv-green)",
    lng: row.lng,
    lat: row.lat,
    companyId: row.company_id,
  };
}

/**
 * Restaurants the current authenticated user is an active member of,
 * via restaurant_members. Returns an empty array if not signed in.
 */
export async function getUserRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("restaurant_members")
    .select("restaurant:restaurants(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .map((row) => row.restaurant as unknown as RestaurantRow | null)
    .filter((r): r is RestaurantRow => Boolean(r))
    .map(mapRestaurant);
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRestaurant(data as RestaurantRow);
}

export type RestaurantInput = {
  name: string;
  address?: string;
  city?: string;
  province?: string;
  timezone?: string;
  color?: string;
};

/**
 * Creates a restaurant and immediately makes the current user its owner.
 * The restaurants insert relies on the "restaurants_owner_insert" policy
 * (with check (true)) in 0001_init.sql, which explicitly defers ownership
 * enforcement to this server-side flow inserting the membership row right
 * after.
 */
export async function createRestaurant(input: RestaurantInput): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !input.name.trim()) return null;

  const coords = input.address && input.city ? await geocodeAddress(input.address, input.city, input.province) : null;

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name.trim(),
      address: input.address || null,
      city: input.city || null,
      province: input.province || undefined,
      timezone: input.timezone || undefined,
      color: input.color || undefined,
      lng: coords?.lng ?? null,
      lat: coords?.lat ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  const { error: memberError } = await supabase.from("restaurant_members").insert({
    restaurant_id: data.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) return null;

  await logActivity({
    restaurantId: data.id,
    actionType: "restaurant.create",
    entityType: "restaurant",
    entityId: data.id,
    description: `A ajouté l'établissement "${data.name}"`,
  });

  return mapRestaurant(data as RestaurantRow);
}

export async function updateRestaurant(
  id: string,
  patch: Partial<RestaurantInput>
): Promise<Restaurant | null> {
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.province !== undefined) dbPatch.province = patch.province;
  if (patch.timezone !== undefined) dbPatch.timezone = patch.timezone;
  if (patch.color !== undefined) dbPatch.color = patch.color;

  // Re-geocode whenever the address changed — this is the only place a
  // restaurant's map pin (lng/lat) gets populated.
  if ((patch.address !== undefined || patch.city !== undefined) && patch.address && patch.city) {
    const coords = await geocodeAddress(patch.address, patch.city, patch.province);
    if (coords) {
      dbPatch.lng = coords.lng;
      dbPatch.lat = coords.lat;
    }
  }

  const { data, error } = await supabase
    .from("restaurants")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId: id,
    actionType: "restaurant.update",
    entityType: "restaurant",
    entityId: id,
    description: `A modifié l'établissement "${data.name}"`,
  });

  return mapRestaurant(data as RestaurantRow);
}

/**
 * Lazily geocodes a restaurant that has an address but no pin yet — covers
 * restaurants created/edited before geocoding existed, without requiring
 * the owner to re-save Workspace. Called from the Maps page on load.
 */
export async function geocodeRestaurantIfMissing(restaurantId: string): Promise<{ lng: number; lat: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("address, city, province, lng, lat")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!data || data.lng !== null || data.lat !== null || !data.address || !data.city) return null;

  const coords = await geocodeAddress(data.address, data.city, data.province);
  if (!coords) return null;

  await supabase.from("restaurants").update({ lng: coords.lng, lat: coords.lat }).eq("id", restaurantId);
  return coords;
}
