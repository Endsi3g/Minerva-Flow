import { NextResponse } from "next/server";
import { after } from "next/server";
import { cloverEnvironment, posOauthRedirectUri } from "@/lib/pos/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { savePosConnectionTokens } from "@/lib/data/pos-connections";
import { backfillPosHistory } from "@/lib/pos/sync";
import { exchangeCloverCode, validateAndFetchCloverMerchant } from "@/lib/pos/clover";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const merchantId = url.searchParams.get("merchant_id") || url.searchParams.get("merchantId");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state || !merchantId || !/^[A-Za-z0-9_-]{1,128}$/.test(merchantId)) {
    settingsUrl.searchParams.set("pos_error", "clover_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("pos_error", "clover_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  // A signed restaurant ID alone does not prove that the returning session
  // still belongs to the initiating manager, restaurant, provider or environment.
  let binding: { provider?: unknown; userId?: unknown; environment?: unknown } | null;
  try {
    binding = verified.extra ? JSON.parse(verified.extra) : null;
  } catch {
    binding = null;
  }
  if (!binding || binding.provider !== "clover" || binding.environment !== cloverEnvironment()) {
    settingsUrl.searchParams.set("pos_error", "clover_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }
  const user = await getVerifiedUser(await createClient());
  const membership = user ? await getCurrentMembership() : null;
  if (!user || binding.userId !== user.id || !membership || membership.restaurantId !== verified.restaurantId || !["owner", "manager"].includes(membership.role)) {
    settingsUrl.searchParams.set("pos_error", "clover_unauthorized");
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = posOauthRedirectUri("clover", url.origin);
  const tokenData = await exchangeCloverCode(code, redirectUri);

  if (!tokenData || !tokenData.accessToken) {
    settingsUrl.searchParams.set("pos_error", "clover_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const merchant = await validateAndFetchCloverMerchant(merchantId, tokenData.accessToken);
  if (!merchant.valid) {
    settingsUrl.searchParams.set("pos_error", "clover_merchant_validation_failed");
    return NextResponse.redirect(settingsUrl);
  }

  // Authorization can be revoked while the provider request is in flight.
  const currentMembership = await getCurrentMembership();
  if (!currentMembership || currentMembership.restaurantId !== verified.restaurantId || !["owner", "manager"].includes(currentMembership.role)) {
    settingsUrl.searchParams.set("pos_error", "clover_unauthorized");
    return NextResponse.redirect(settingsUrl);
  }
  try {
    await savePosConnectionTokens(verified.restaurantId, "clover", {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      externalAccountId: merchantId,
    });
  } catch {
    settingsUrl.searchParams.set("pos_error", "clover_connection_storage_failed");
    return NextResponse.redirect(settingsUrl);
  }

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
