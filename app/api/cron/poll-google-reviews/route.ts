import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaceReviews } from "@/lib/google-places";
import { sendReputationAlertEmail } from "@/lib/email/resend";

/**
 * Runs once daily (see vercel.json — Vercel's Hobby plan only allows daily
 * cron jobs). For every restaurant that's connected a Google Maps listing
 * (restaurants.google_place_id, set via the Reputation page — Phase 2),
 * fetches its current reviews (Places API v1 only ever returns up to 5
 * "most relevant" reviews, no full history or pagination — a real Google
 * limitation, fine for *monitoring new* reviews going forward) and
 * upserts any new one into google_reviews. A review at or below the
 * reputation threshold (<=3*) also gets an alerts row (same
 * computed_key idempotency pattern as sync-alerts) and a best-effort
 * email to the restaurant's owner.
 *
 * Admin (service-role) client throughout: a cron request carries no
 * session/cookies, so RLS would otherwise silently return nothing.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: restaurants, error: restaurantsError } = await admin
    .from("restaurants")
    .select("id, name, google_place_id")
    .not("google_place_id", "is", null);

  if (restaurantsError || !restaurants) {
    return NextResponse.json({ error: "Impossible de charger les restaurants connectés" }, { status: 500 });
  }

  const results = await Promise.all(
    restaurants.map(async (restaurant) => {
      const restaurantId = restaurant.id as string;
      const restaurantName = restaurant.name as string;
      const placeId = restaurant.google_place_id as string;

      const reviews = await getPlaceReviews(placeId);
      if (reviews.length === 0) return { restaurantId, fetched: 0, newLowRated: 0 };

      let newLowRated = 0;
      for (const review of reviews) {
        const { data: existing } = await admin
          .from("google_reviews")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("google_review_id", review.reviewId)
          .maybeSingle();

        const { data: upserted, error: upsertError } = await admin
          .from("google_reviews")
          .upsert(
            {
              restaurant_id: restaurantId,
              google_review_id: review.reviewId,
              author_name: review.authorName,
              rating: review.rating,
              review_text: review.text,
              published_at: review.publishTime,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "restaurant_id,google_review_id" }
          )
          .select("id")
          .single();

        if (upsertError || !upserted) continue;
        const isNew = !existing;

        if (isNew && review.rating <= 3) {
          newLowRated += 1;
          await admin.from("alerts").upsert(
            {
              restaurant_id: restaurantId,
              type: "google_review_new",
              severity: review.rating <= 2 ? "critique" : "important",
              title: `Nouvel avis Google Maps (${review.rating}★)`,
              detail: review.text ?? "Aucun commentaire.",
              related_entity_type: "google_review",
              related_entity_id: upserted.id,
              computed_key: `google_review_${upserted.id}`,
            },
            { onConflict: "restaurant_id,computed_key" }
          );

          const { data: owner } = await admin
            .from("restaurant_members")
            .select("profiles(email)")
            .eq("restaurant_id", restaurantId)
            .eq("role", "owner")
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          const ownerEmail = (owner?.profiles as unknown as { email: string } | null)?.email;
          if (ownerEmail) {
            await sendReputationAlertEmail({
              to: ownerEmail,
              restaurantName,
              authorName: review.authorName,
              rating: review.rating,
              reviewText: review.text,
            });
          }
        }
      }

      return { restaurantId, fetched: reviews.length, newLowRated };
    })
  );

  return NextResponse.json({ results });
}
