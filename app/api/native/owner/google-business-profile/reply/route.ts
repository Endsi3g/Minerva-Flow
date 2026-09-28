import { NextResponse } from "next/server";
import { GoogleBusinessProfileError, replyToGoogleBusinessReview } from "@/lib/google/business-profile";
import { getGoogleTokens } from "@/lib/data/google-connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";
import { GOOGLE_SCOPES } from "@/lib/google/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { restaurantId?: string; reviewName?: string; comment?: string } | null;
  const auth = await getNativeOwnerContext(request, body?.restaurantId ?? null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const comment = body?.comment?.trim() ?? "";
  if (comment.length < 1 || comment.length > 4096 || !body?.reviewName) return NextResponse.json({ error: "Rédigez une réponse de 1 à 4 096 caractères." }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection } = await admin.from("google_connections")
    .select("granted_scopes, business_profile_account_name, business_profile_location_name")
    .eq("restaurant_id", auth.context.restaurantId).maybeSingle();
  if (!connection?.granted_scopes?.includes(GOOGLE_SCOPES.business_profile) || !connection.business_profile_account_name || !connection.business_profile_location_name) {
    return NextResponse.json({ error: "Connectez et sélectionnez une fiche Google Business Profile." }, { status: 409 });
  }
  const reviewPrefix = `${connection.business_profile_account_name}/${connection.business_profile_location_name}/reviews/`;
  if (!body.reviewName.startsWith(reviewPrefix)) return NextResponse.json({ error: "Cet avis ne correspond pas à la fiche sélectionnée." }, { status: 403 });
  const tokens = await getGoogleTokens(auth.context.restaurantId);
  if (!tokens) return NextResponse.json({ error: "Reconnectez Google Business Profile pour continuer." }, { status: 409 });

  try {
    const result = await replyToGoogleBusinessReview(tokens.accessToken, body.reviewName, comment);
    const { error: updateError } = await admin.from("google_reviews").update({
      owner_response: result.comment,
      owner_responded_at: result.updateTime ?? new Date().toISOString(),
      fetched_at: new Date().toISOString(),
    }).eq("restaurant_id", auth.context.restaurantId).eq("google_review_id", body.reviewName);
    if (updateError) return NextResponse.json({ error: "La réponse a été publiée, mais son état local n’a pas pu être rafraîchi." }, { status: 500 });
    return NextResponse.json({ ok: true, comment: result.comment, updateTime: result.updateTime ?? null });
  } catch (cause) {
    const message = cause instanceof GoogleBusinessProfileError ? cause.message : "Impossible de publier la réponse Google.";
    const status = cause instanceof GoogleBusinessProfileError ? cause.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
