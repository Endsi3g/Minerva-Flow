import { NextResponse } from "next/server";
import { isGoogleAdsConfigured, oauthRedirectUri } from "@/lib/ad-platforms/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

const GOOGLE_OAUTH_DIALOG = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

export async function GET(req: Request) {
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: "Google Ads n'est pas encore configuré (GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(GOOGLE_OAUTH_DIALOG);
  authorizeUrl.searchParams.set("client_id", process.env.GOOGLE_ADS_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri("google", origin));
  authorizeUrl.searchParams.set("scope", GOOGLE_ADS_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl.toString());
}
