import { NextResponse } from "next/server";
import { after } from "next/server";
import { posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";
import { backfillPosHistory } from "@/lib/pos/sync";
import { exchangeCloverCode } from "@/lib/pos/clover";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const merchantId = url.searchParams.get("merchant_id") || url.searchParams.get("merchantId");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("pos_error", "clover_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "clover_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = posOauthRedirectUri("clover", url.origin);
  const tokenData = await exchangeCloverCode(code, redirectUri);

  if (!tokenData || !tokenData.accessToken) {
    settingsUrl.searchParams.set("pos_error", "clover_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  await savePosConnectionTokens(verified.restaurantId, "clover", {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt,
    externalAccountId: merchantId || tokenData.merchantId || undefined,
  });

  // Pulls the last 90 days of Clover sales in the background so a newly
  // connected restaurant sees a full history immediately, without holding
  // up this redirect for ~90 sequential Clover API calls.
  after(async () => {
    try {
      await backfillPosHistory("clover", verified.restaurantId);
    } catch (err) {
      console.error("Clover history backfill failed:", err);
    }
  });

  settingsUrl.searchParams.set("pos_connected", "clover");
  return NextResponse.redirect(settingsUrl);
}
