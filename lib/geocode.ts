import "server-only";

/**
 * Free, no-key geocoding (OpenStreetMap Nominatim) — best-effort, never
 * blocks the caller's save. Usage policy requires a descriptive
 * User-Agent and no more than ~1 req/s, both fine for on-save use.
 */
export async function geocodeAddress(
  address: string,
  city: string,
  province?: string
): Promise<{ lng: number; lat: number } | null> {
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
