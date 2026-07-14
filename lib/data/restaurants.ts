import { createClient } from "@/lib/supabase/server";
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
