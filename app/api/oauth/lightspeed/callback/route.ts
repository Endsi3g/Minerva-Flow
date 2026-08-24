import { NextResponse } from "next/server";
import { after } from "next/server";
import { lightspeedAuthBaseUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";
import { backfillPosHistory } from "@/lib/pos/sync";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("pos_error", "lightspeed_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "lightspeed_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  // Client credentials go in a Basic Auth header for Lightspeed, unlike
  // Square's JSON body — see lib/pos/lightspeed.ts's file-level comment.
  const basicAuth = Buffer.from(
    `${process.env.LIGHTSPEED_APPLICATION_ID}:${process.env.LIGHTSPEED_APPLICATION_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch(`${lightspeedAuthBaseUrl()}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: posOauthRedirectUri("lightspeed", url.origin),
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("pos_error", "lightspeed_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("pos_error", "lightspeed_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  await savePosConnectionTokens(verified.restaurantId, "lightspeed", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
  });

  after(async () => {
    try {
      await backfillPosHistory("lightspeed", verified.restaurantId);
    } catch (err) {
      console.error("Lightspeed history backfill failed:", err);
    }
  });

  settingsUrl.searchParams.set("pos_connected", "lightspeed");
  return NextResponse.redirect(settingsUrl);
}
