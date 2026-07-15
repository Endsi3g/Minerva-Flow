import { NextResponse } from "next/server";
import { squareBaseUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("pos_error", "square_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "square_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenRes = await fetch(`${squareBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: posOauthRedirectUri("square", url.origin),
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("pos_error", "square_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    merchant_id?: string;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("pos_error", "square_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  await savePosConnectionTokens(verified.restaurantId, "square", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
    externalAccountId: tokenData.merchant_id,
  });

  settingsUrl.searchParams.set("pos_connected", "square");
  return NextResponse.redirect(settingsUrl);
}
