import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/tokens";
import type {
  PhysicalTouchpoint,
  PhysicalTouchpointDestinationKind,
  PhysicalTouchpointEventType,
  PhysicalTouchpointFunnel,
  PhysicalTouchpointType,
} from "@/lib/types";

type PhysicalTouchpointRow = {
  id: string;
  restaurant_id: string;
  type: PhysicalTouchpointType;
  label: string;
  code: string;
  destination_kind: PhysicalTouchpointDestinationKind;
  destination_value: string;
  campaign_id: string | null;
  is_active: boolean;
  created_at: string;
};

function mapTouchpoint(row: PhysicalTouchpointRow): PhysicalTouchpoint {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    type: row.type,
    label: row.label,
    code: row.code,
    destinationKind: row.destination_kind,
    destinationValue: row.destination_value,
    campaignId: row.campaign_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getTouchpointsForRestaurant(restaurantId: string): Promise<PhysicalTouchpoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physical_touchpoints")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as PhysicalTouchpointRow[]).map(mapTouchpoint);
}

export async function createTouchpoint(
  restaurantId: string,
  input: {
    type: PhysicalTouchpointType;
    label: string;
    destinationKind: PhysicalTouchpointDestinationKind;
    destinationValue: string;
  }
): Promise<PhysicalTouchpoint | null> {
  const supabase = await createClient();
  // Short (8-char) code — this is printed/engraved on physical hardware and
  // typed by hand as a fallback if the QR fails to scan, unlike the longer
  // opaque tokens used for menu/loyalty share links.
  const code = generateToken(8);

  const { data, error } = await supabase
    .from("physical_touchpoints")
    .insert({
      restaurant_id: restaurantId,
      type: input.type,
      label: input.label,
      code,
      destination_kind: input.destinationKind,
      destination_value: input.destinationValue,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error) console.error("createTouchpoint failed:", error.message);
    return null;
  }
  return mapTouchpoint(data as PhysicalTouchpointRow);
}

export async function deleteTouchpoint(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("physical_touchpoints")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  return !error;
}

/**
 * Where a tap actually lands, resolved at request time by the public
 * /t/[code] redirect route. loyalty_join/menu resolve against the same
 * share tables the QR Studio already prints tokens for — a touchpoint isn't
 * a second, parallel share mechanism, just an attributed entry point into
 * the existing one. review/custom_url are raw external URLs (a Google
 * review link, or anything else the owner pastes in), stored as-is.
 *
 * Returns a path (starting with "/") for the two internal kinds, resolved
 * by the caller against the *actual incoming request's* origin — never
 * against NEXT_PUBLIC_APP_URL, which is the production domain even in
 * local dev/preview and would otherwise redirect a local tap out to the
 * live site (caught by the e2e suite for this feature).
 */
export async function resolveTouchpointByCode(
  code: string
): Promise<{ touchpoint: PhysicalTouchpoint; redirectPath: string; isExternal: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("physical_touchpoints")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;

  const touchpoint = mapTouchpoint(data as PhysicalTouchpointRow);

  if (touchpoint.destinationKind === "loyalty_join") {
    return { touchpoint, redirectPath: `/f/${touchpoint.destinationValue}?tp=${touchpoint.code}`, isExternal: false };
  }
  if (touchpoint.destinationKind === "menu") {
    return { touchpoint, redirectPath: `/m/${touchpoint.destinationValue}?tp=${touchpoint.code}`, isExternal: false };
  }
  return { touchpoint, redirectPath: touchpoint.destinationValue, isExternal: true };
}

/** Called anonymously (no session) from the public /t/[code] route and from the destination pages it forwards to (loyalty join, menu order). */
export async function recordTouchpointEvent(
  touchpointId: string,
  eventType: PhysicalTouchpointEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("physical_touchpoint_events").insert({
    touchpoint_id: touchpointId,
    event_type: eventType,
    metadata: metadata ?? {},
  });
}

export async function recordTouchpointEventByCode(
  code: string,
  eventType: PhysicalTouchpointEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("physical_touchpoints").select("id").eq("code", code).maybeSingle();
  const id = (data as { id: string } | null)?.id;
  if (id) await recordTouchpointEvent(id, eventType, metadata);
}

/**
 * Staff-facing funnel counts per touchpoint — powers the "le chevalet près
 * de la caisse a généré 89 inscriptions" comparison across the venue's
 * physical inventory. Reads events for every touchpoint of the restaurant
 * in one query rather than N+1 per row.
 */
export async function getTouchpointFunnels(restaurantId: string): Promise<PhysicalTouchpointFunnel[]> {
  const touchpoints = await getTouchpointsForRestaurant(restaurantId);
  if (touchpoints.length === 0) return [];

  const supabase = await createClient();
  const { data: eventRows } = await supabase
    .from("physical_touchpoint_events")
    .select("touchpoint_id, event_type")
    .in(
      "touchpoint_id",
      touchpoints.map((t) => t.id)
    );

  const countsByTouchpoint = new Map<string, Partial<Record<PhysicalTouchpointEventType, number>>>();
  for (const row of (eventRows ?? []) as { touchpoint_id: string; event_type: PhysicalTouchpointEventType }[]) {
    const counts = countsByTouchpoint.get(row.touchpoint_id) ?? {};
    counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    countsByTouchpoint.set(row.touchpoint_id, counts);
  }

  return touchpoints.map((touchpoint) => ({
    touchpoint,
    counts: countsByTouchpoint.get(touchpoint.id) ?? {},
  }));
}
