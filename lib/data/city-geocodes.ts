import "server-only";

import { createClient } from "@/lib/supabase/server";
import { geocodeCity } from "@/lib/geocode";

export type CityCoordinates = { city: string; lng: number; lat: number };

function cityKey(city: string): string {
  return city.trim().toLowerCase();
}

/** Batch-reads whatever's already cached — never geocodes, so it's always fast. */
export async function getCachedCityCoordinates(cities: string[]): Promise<Record<string, CityCoordinates>> {
  const keys = Array.from(new Set(cities.map(cityKey).filter(Boolean)));
  if (keys.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase.from("city_geocodes").select("city_key, city_label, lat, lng").in("city_key", keys);

  const result: Record<string, CityCoordinates> = {};
  for (const row of (data as { city_key: string; city_label: string; lat: number; lng: number }[]) ?? []) {
    result[row.city_key] = { city: row.city_label, lng: row.lng, lat: row.lat };
  }
  return result;
}

/** Geocodes one city and caches the result — call lazily, one city at a time, from the client. */
export async function geocodeCityIfMissing(city: string): Promise<CityCoordinates | null> {
  const trimmed = city.trim();
  if (!trimmed) return null;
  const key = cityKey(trimmed);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("city_geocodes")
    .select("city_label, lat, lng")
    .eq("city_key", key)
    .maybeSingle();
  if (existing) {
    const row = existing as { city_label: string; lat: number; lng: number };
    return { city: row.city_label, lng: row.lng, lat: row.lat };
  }

  const coords = await geocodeCity(trimmed);
  if (!coords) return null;

  await supabase.from("city_geocodes").upsert(
    { city_key: key, city_label: trimmed, lat: coords.lat, lng: coords.lng },
    { onConflict: "city_key" }
  );
  return { city: trimmed, ...coords };
}
