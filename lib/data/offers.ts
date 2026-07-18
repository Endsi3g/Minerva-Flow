import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCustomers } from "@/lib/data/notifications";
import type { Offer } from "@/lib/types";

type OfferRow = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

/**
 * Resolves the restaurant's "main" menu-share link to point a push
 * notification at — prefers the full-menu share (item_ids null) since
 * that's what the QR code in MenuView.tsx generates, falling back to
 * whichever share exists first. Returns null if the restaurant has never
 * generated a share link at all (nothing to link to yet).
 */
async function getPrimaryMenuShareLink(restaurantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("menu_shares")
    .select("token, item_ids, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  const shares = (data as { token: string; item_ids: string[] | null }[] | null) ?? [];
  if (shares.length === 0) return null;
  const fullMenuShare = shares.find((s) => !s.item_ids || s.item_ids.length === 0);
  return `/m/${(fullMenuShare ?? shares[0]).token}`;
}

/** True when an offer is active AND its start/end window (if any) currently contains `now`. */
function isEffectivelyLive(offer: { active: boolean; startsAt: string | null; endsAt: string | null }, now = Date.now()): boolean {
  if (!offer.active) return false;
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now) return false;
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return false;
  return true;
}

function mapOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    active: row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export type OfferInput = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

/** Staff-facing list, newest first — gated by the offers_select RLS policy. */
export async function getOffersForRestaurant(restaurantId: string): Promise<Offer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as OfferRow[]).map(mapOffer);
}

/**
 * Public-facing, unauthenticated read — used by the /m/[token] client-mode
 * page, exactly like getMenuShareByToken reads menu_items via the admin
 * client rather than relying on a visitor's (nonexistent) RLS session.
 */
export async function getActiveOffersForRestaurant(restaurantId: string): Promise<Offer[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("offers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as OfferRow[]).map(mapOffer);
}

/**
 * Creates an offer; notifies the restaurant's linked customers immediately
 * only if it's live right now (active, and within its start/end window if
 * one is set). An offer scheduled for a future startsAt does NOT notify —
 * there's no delivery-at-future-time scheduler here, so a scheduled offer's
 * customers simply see it appear on /m/[token] once it goes live, without a
 * push nudge for that particular moment.
 */
export async function createOffer(restaurantId: string, input: OfferInput): Promise<Offer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("offers")
    .insert({
      restaurant_id: restaurantId,
      title: input.title,
      description: input.description ?? null,
      image_url: input.imageUrl ?? null,
      active: input.active ?? true,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  const offer = mapOffer(data as OfferRow);

  if (isEffectivelyLive(offer)) {
    await notifyCustomers({
      restaurantId,
      type: "offer.published",
      title: "Nouvelle offre",
      body: offer.title,
      link: (await getPrimaryMenuShareLink(restaurantId)) ?? undefined,
    });
  }

  return offer;
}

/** Updates an offer; notifies customers only on the not-live → live transition (not on every edit). */
export async function updateOffer(
  restaurantId: string,
  offerId: string,
  input: Partial<OfferInput>
): Promise<Offer | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("offers")
    .select("active, starts_at, ends_at")
    .eq("restaurant_id", restaurantId)
    .eq("id", offerId)
    .maybeSingle();
  const existingRow = existing as { active: boolean; starts_at: string | null; ends_at: string | null } | null;
  const wasLive = existingRow
    ? isEffectivelyLive({ active: existingRow.active, startsAt: existingRow.starts_at, endsAt: existingRow.ends_at })
    : false;

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.active !== undefined) patch.active = input.active;
  if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
  if (input.endsAt !== undefined) patch.ends_at = input.endsAt;

  const { data, error } = await supabase
    .from("offers")
    .update(patch)
    .eq("restaurant_id", restaurantId)
    .eq("id", offerId)
    .select("*")
    .single();

  if (error || !data) return null;
  const offer = mapOffer(data as OfferRow);

  if (isEffectivelyLive(offer) && !wasLive) {
    await notifyCustomers({
      restaurantId,
      type: "offer.published",
      title: "Nouvelle offre",
      body: offer.title,
      link: (await getPrimaryMenuShareLink(restaurantId)) ?? undefined,
    });
  }

  return offer;
}

export async function deleteOffer(restaurantId: string, offerId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("offers").delete().eq("restaurant_id", restaurantId).eq("id", offerId);
  return !error;
}
