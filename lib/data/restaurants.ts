import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Restaurant } from "@/lib/types";

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

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name.trim(),
      address: input.address || null,
      city: input.city || null,
      province: input.province || undefined,
      timezone: input.timezone || undefined,
      color: input.color || undefined,
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
