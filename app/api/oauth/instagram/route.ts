import { NextResponse } from "next/server";
import { isInstagramConfigured, oauthRedirectUri } from "@/lib/ad-platforms/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

const META_OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

// Content-publishing scopes, deliberately separate from Meta Ads'
// ads_read/business_management — an owner connecting Instagram to publish
// posts hasn't necessarily granted anything about their ad account.
// pages_show_list + pages_read_engagement are required to discover which
// Facebook Page (and its linked Instagram professional account) to publish
// through; instagram_content_publish is the actual publish permission.
const INSTAGRAM_SCOPE = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

export async function GET(req: Request) {
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      { error: "Instagram n'est pas encore configuré (META_APP_ID / META_APP_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(META_OAUTH_DIALOG);
  authorizeUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri("instagram", origin));
  authorizeUrl.searchParams.set("scope", INSTAGRAM_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authorizeUrl.toString());
}
