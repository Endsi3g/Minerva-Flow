import { NextResponse } from "next/server";
import {
  isInstagramConfigured,
  getInstagramAppId,
  oauthRedirectUri,
  INSTAGRAM_DIRECT_SCOPES,
  INSTAGRAM_FACEBOOK_SCOPES,
} from "@/lib/ad-platforms/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

const INSTAGRAM_DIRECT_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const FACEBOOK_OAUTH_DIALOG_URL = "https://www.facebook.com/v21.0/dialog/oauth";

export async function GET(req: Request) {
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      { error: "Instagram n'est pas encore configuré (INSTAGRAM_APP_ID / META_APP_ID manquant)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "facebook" ? "facebook" : "direct";
  const origin = url.origin;
  const state = signOAuthState(membership.restaurantId, mode);

  if (mode === "direct") {
    // Official Business Login for Instagram (graph.instagram.com)
    // Direct login via Instagram credentials, no Facebook Page requirement.
    const appId = getInstagramAppId()!;
    const authorizeUrl = new URL(INSTAGRAM_DIRECT_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", appId);
    authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri("instagram", origin));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", INSTAGRAM_DIRECT_SCOPES);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("enable_fb_login", "true");

    return NextResponse.redirect(authorizeUrl.toString());
  } else {
    // Legacy Facebook Login for Business (for users linking Meta Ads accounts)
    const authorizeUrl = new URL(FACEBOOK_OAUTH_DIALOG_URL);
    authorizeUrl.searchParams.set("client_id", process.env.META_APP_ID!);
    authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri("instagram", origin));
    authorizeUrl.searchParams.set("scope", INSTAGRAM_FACEBOOK_SCOPES);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("response_type", "code");

    return NextResponse.redirect(authorizeUrl.toString());
  }
}
