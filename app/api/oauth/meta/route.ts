import { NextResponse } from "next/server";
import { isMetaAdsConfigured, oauthRedirectUri } from "@/lib/ad-platforms/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

const META_OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";
const META_ADS_SCOPE = "ads_read,business_management";

export async function GET(req: Request) {
  if (!isMetaAdsConfigured()) {
    return NextResponse.json(
      { error: "Meta Ads n'est pas encore configuré (META_APP_ID / META_APP_SECRET manquants)." },
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
  authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri("meta", origin));
  authorizeUrl.searchParams.set("scope", META_ADS_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authorizeUrl.toString());
}
