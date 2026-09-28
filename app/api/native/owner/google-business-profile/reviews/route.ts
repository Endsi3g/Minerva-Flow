import { NextResponse } from "next/server";
import { GoogleBusinessProfileError, listGoogleBusinessReviews } from "@/lib/google/business-profile";
import { getGoogleTokens, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";
import { GOOGLE_SCOPES } from "@/lib/google/config";

export const dynamic = "force-dynamic";

const ratingValue: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await getNativeOwnerContext(request, url.searchParams.get("restaurantId"));
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const pageToken = url.searchParams.get("pageToken") ?? undefined;
  if (pageToken && pageToken.length > 2048) return NextResponse.json({ error: "Le jeton de pagination Google est invalide." }, { status: 400 });
  const admin = createAdminClient();
  const { data: connection } = await admin.from("google_connections")
    .select("granted_scopes, business_profile_account_name, business_profile_location_name")
    .eq("restaurant_id", auth.context.restaurantId).maybeSingle();
  if (!connection?.granted_scopes?.includes(GOOGLE_SCOPES.business_profile) || !connection.business_profile_account_name || !connection.business_profile_location_name) {
    return NextResponse.json({ error: "Connectez et sélectionnez une fiche Google Business Profile." }, { status: 409 });
  }
  const tokens = await getGoogleTokens(auth.context.restaurantId);
  if (!tokens) return NextResponse.json({ error: "Reconnectez Google Business Profile pour continuer." }, { status: 409 });

  try {
    const page = await listGoogleBusinessReviews(tokens.accessToken, connection.business_profile_account_name, connection.business_profile_location_name, pageToken);
    const reviews = page.reviews.map((review) => ({
      id: review.name,
      authorName: review.reviewer?.displayName ?? "Client Google",
      rating: ratingValue[review.starRating ?? ""] ?? 0,
      comment: review.comment ?? "",
      createdAt: review.createTime ?? null,
      ownerReply: review.reviewReply?.comment ?? null,
      replyUpdatedAt: review.reviewReply?.updateTime ?? null,
    }));

    if (reviews.length) {
      const { error: syncError } = await admin.from("google_reviews").upsert(reviews.map((review) => ({
        restaurant_id: auth.context.restaurantId,
        google_review_id: review.id,
        author_name: review.authorName,
        rating: review.rating,
        review_text: review.comment || null,
        published_at: review.createdAt,
        owner_response: review.ownerReply,
        owner_responded_at: review.replyUpdatedAt,
        fetched_at: new Date().toISOString(),
      })), { onConflict: "restaurant_id,google_review_id" });
      if (syncError) return NextResponse.json({ error: "Les avis ont été lus, mais leur enregistrement local a échoué." }, { status: 500 });
    }
    await updateGoogleConnectionMeta(auth.context.restaurantId, { businessProfileSyncedAt: new Date().toISOString() });
    return NextResponse.json({ reviews, nextPageToken: page.nextPageToken ?? null, totalReviewCount: page.totalReviewCount ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof GoogleBusinessProfileError ? cause.message : "Impossible de charger les avis Google.";
    const status = cause instanceof GoogleBusinessProfileError ? cause.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
