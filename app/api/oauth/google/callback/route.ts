import { NextResponse } from "next/server";
import { oauthRedirectUri } from "@/lib/ad-platforms/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveAdPlatformTokens } from "@/lib/data/ad-platforms";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("ads_error", "google_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("ads_error", "google_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      redirect_uri: oauthRedirectUri("google", url.origin),
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("ads_error", "google_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("ads_error", "google_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  await saveAdPlatformTokens(verified.restaurantId, "google", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined,
  });

  settingsUrl.searchParams.set("ads_connected", "google");
  return NextResponse.redirect(settingsUrl);
}
