import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * A restaurant-level review the star-gating trigger (0098) has marked
 * private (rating < 4) — these are the ones the Reputation page exists
 * to surface, since they're otherwise invisible to anyone but their own
 * author. Google Maps reviews are a separate, later addition (Phase 3 —
 * see google_reviews, not yet built) and aren't mixed into this list.
 */
export type PrivateReviewWithCustomer = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
};

type PrivateReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  owner_response: string | null;
  owner_responded_at: string | null;
  customers: { name: string } | null;
};

export async function getPrivateReviews(restaurantId: string): Promise<PrivateReviewWithCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_reviews")
    .select("id, rating, comment, created_at, owner_response, owner_responded_at, customers(name)")
    .eq("restaurant_id", restaurantId)
    .eq("visibility", "private")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as PrivateReviewRow[]).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    customerName: row.customers?.name ?? "Client",
    ownerResponse: row.owner_response,
    ownerRespondedAt: row.owner_responded_at,
  }));
}

export type ItemOrOfferReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  name: string;
  kind: "menu_item" | "offer";
};

/**
 * Read-only visibility into menu_item_reviews/offer_reviews — both have
 * had a full native read+write UI for a while (menu items) or since this
 * same bundle (offers), but zero owner-side surface until now.
 */
export async function getMenuAndOfferReviews(restaurantId: string): Promise<ItemOrOfferReview[]> {
  const supabase = await createClient();
  const [menuResult, offerResult] = await Promise.all([
    supabase
      .from("menu_item_reviews")
      .select("id, rating, comment, created_at, menu_items(name)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("offer_reviews")
      .select("id, rating, comment, created_at, offers(title)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type MenuReviewRow = { id: string; rating: number; comment: string | null; created_at: string; menu_items: { name: string } | null };
  type OfferReviewRow = { id: string; rating: number; comment: string | null; created_at: string; offers: { title: string } | null };

  const menu = ((menuResult.data ?? []) as unknown as MenuReviewRow[]).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    name: row.menu_items?.name ?? "Plat",
    kind: "menu_item" as const,
  }));
  const offers = ((offerResult.data ?? []) as unknown as OfferReviewRow[]).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    name: row.offers?.title ?? "Offre",
    kind: "offer" as const,
  }));

  return [...menu, ...offers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * respond_to_review (0098) re-checks is_restaurant_member itself using
 * the caller's own auth context — this must go through the session-scoped
 * client (not the admin client) for that check to mean anything, and a
 * guard trigger on restaurant_reviews prevents any other write path from
 * touching owner_response at all.
 */
export async function respondToReview(reviewId: string, response: string): Promise<boolean> {
  if (!response.trim()) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_review", { p_review_id: reviewId, p_response: response.trim() });
  return !error;
}
