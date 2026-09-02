import { NextResponse } from "next/server";
import { QUICKBOOKS_TOKEN_URL, posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // QuickBooks-specific: the company (ledger) the user picked during
  // consent comes back as its own query param, not inside the token
  // response body — every subsequent Accounting API call needs it.
  const realmId = url.searchParams.get("realmId");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state || !realmId) {
    settingsUrl.searchParams.set("pos_error", "quickbooks_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "quickbooks_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const basicAuth = Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString(
    "base64"
  );

  const tokenRes = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: posOauthRedirectUri("quickbooks", url.origin),
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("pos_error", "quickbooks_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("pos_error", "quickbooks_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : undefined;

  await savePosConnectionTokens(verified.restaurantId, "quickbooks", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    externalAccountId: realmId,
  });

  settingsUrl.searchParams.set("pos_connected", "quickbooks");
  return NextResponse.redirect(settingsUrl);
}
