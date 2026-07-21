import "server-only";
import type { OpeningHours } from "@/lib/types";
import type { RestaurantInput } from "@/lib/data/restaurants";

const FETCH_TIMEOUT_MS = 6000;

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

/**
 * Best-effort, never throws — same contract as lib/geocode.ts. Returns []
 * on any failure (not configured, network error, bad response, timeout),
 * never a thrown error, so a flaky/absent Places API never blocks the rest
 * of the search UI.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const key = apiKey();
  const trimmed = query.trim();
  if (!key || trimmed.length < 3) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input: trimmed, includedRegionCodes: ["ca"] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId: string;
          structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
          text?: { text: string };
        };
      }[];
    };

    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        placeId: p.placeId,
        primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      }));
  } catch {
    return [];
  }
}

type PlaceOpeningPeriod = {
  open?: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

type PlaceDetailsRaw = {
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  location?: { latitude?: number; longitude?: number };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    periods?: PlaceOpeningPeriod[];
  };
};

export type PlaceDetails = PlaceDetailsRaw & { placeId: string };

/**
 * Same best-effort contract — returns null on any failure, never throws.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = apiKey();
  if (!key || !placeId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const fieldMask = [
      "displayName",
      "formattedAddress",
      "addressComponents",
      "location",
      "internationalPhoneNumber",
      "websiteUri",
      "regularOpeningHours",
    ].join(",");
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as PlaceDetailsRaw;
    return { ...data, placeId };
  } catch {
    return null;
  }
}

function componentByType(details: PlaceDetailsRaw, type: string): string | undefined {
  return details.addressComponents?.find((c) => c.types?.includes(type))?.longText;
}

function componentShortByType(details: PlaceDetailsRaw, type: string): string | undefined {
  return details.addressComponents?.find((c) => c.types?.includes(type))?.shortText;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Groups Places' flat open/close period list by day, keeping only the
 * first open / last close per day (v1 simplification for split-shift days
 * — see supabase/migrations/0021_restaurant_places_and_hours.sql).
 */
function mapOpeningHours(periods: PlaceOpeningPeriod[] | undefined): OpeningHours | undefined {
  if (!periods || periods.length === 0) return undefined;
  const hours: OpeningHours = {};
  for (const period of periods) {
    if (!period.open) continue;
    const day = period.open.day as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const open = `${pad2(period.open.hour)}:${pad2(period.open.minute)}`;
    const close = period.close ? `${pad2(period.close.hour)}:${pad2(period.close.minute)}` : open;
    const existing = hours[day];
    if (!existing) {
      hours[day] = { open, close };
    } else {
      hours[day] = { open: existing.open < open ? existing.open : open, close: existing.close > close ? existing.close : close };
    }
  }
  return hours;
}

/**
 * Pure function, no network — maps a Places Details response onto the
 * RestaurantInput shape the caller merges into its own form state.
 */
export function mapPlaceDetailsToRestaurantInput(details: PlaceDetails): Partial<RestaurantInput> {
  const streetNumber = componentByType(details, "street_number");
  const route = componentByType(details, "route");
  const address = [streetNumber, route].filter(Boolean).join(" ") || details.formattedAddress;

  return {
    address,
    city: componentByType(details, "locality") ?? componentByType(details, "postal_town"),
    province: componentShortByType(details, "administrative_area_level_1"),
    postalCode: componentByType(details, "postal_code"),
    lat: details.location?.latitude,
    lng: details.location?.longitude,
    phone: details.internationalPhoneNumber,
    website: details.websiteUri,
    openingHours: mapOpeningHours(details.regularOpeningHours?.periods),
    googlePlaceId: details.placeId,
  };
}
