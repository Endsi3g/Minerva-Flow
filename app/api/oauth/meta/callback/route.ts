import { NextResponse } from "next/server";
import { oauthRedirectUri } from "@/lib/ad-platforms/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveAdPlatformTokens } from "@/lib/data/ad-platforms";

const META_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("ads_error", "meta_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("ads_error", "meta_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", oauthRedirectUri("meta", url.origin));
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("ads_error", "meta_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("ads_error", "meta_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  await saveAdPlatformTokens(verified.restaurantId, "meta", {
    accessToken: tokenData.access_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined,
  });

  settingsUrl.searchParams.set("ads_connected", "meta");
  return NextResponse.redirect(settingsUrl);
}
