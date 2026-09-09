import { NextResponse } from "next/server";
import { after } from "next/server";
import { posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";
import { backfillPosHistory } from "@/lib/pos/sync";
import { exchangeToastCode } from "@/lib/pos/toast";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const restaurantGuid = url.searchParams.get("restaurant_guid") || url.searchParams.get("restaurantGuid");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("pos_error", "toast_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "toast_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = posOauthRedirectUri("toast", url.origin);
  const tokenData = await exchangeToastCode(code, redirectUri);

  if (!tokenData || !tokenData.accessToken) {
    settingsUrl.searchParams.set("pos_error", "toast_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  await savePosConnectionTokens(verified.restaurantId, "toast", {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt,
    externalAccountId: restaurantGuid || tokenData.restaurantGuid || undefined,
  });

  // Pulls the last 90 days of Toast sales in the background
  after(async () => {
    try {
      await backfillPosHistory("toast", verified.restaurantId);
    } catch (err) {
      console.error("Toast history backfill failed:", err);
    }
  });

  settingsUrl.searchParams.set("pos_connected", "toast");
  return NextResponse.redirect(settingsUrl);
}
