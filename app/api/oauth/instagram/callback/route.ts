import { NextResponse } from "next/server";
import { oauthRedirectUri } from "@/lib/ad-platforms/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveAdPlatformTokens } from "@/lib/data/ad-platforms";

const GRAPH_VERSION = "v21.0";
const META_TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;

/**
 * Finds the Instagram professional account linked to one of the user's
 * Facebook Pages — this is the real Meta publishing model: there is no
 * "Instagram account id" independent of a connected Page. Returns null
 * (not an error) when the token is valid but no Page has an Instagram
 * account linked yet — the connection still gets saved as "connecté" so
 * the settings/onboarding UI can point the owner at linking one in Meta
 * Business Suite, rather than failing the whole OAuth round-trip.
 */
async function findInstagramBusinessAccountId(accessToken: string): Promise<string | null> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
  );
  if (!pagesRes.ok) return null;

  const pagesData = (await pagesRes.json()) as {
    data?: { id: string; instagram_business_account?: { id: string } }[];
  };
  const pageWithInstagram = pagesData.data?.find((p) => p.instagram_business_account?.id);
  return pageWithInstagram?.instagram_business_account?.id ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("ads_error", "instagram_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("ads_error", "instagram_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", oauthRedirectUri("instagram", url.origin));
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("ads_error", "instagram_token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("ads_error", "instagram_no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  const instagramBusinessAccountId = await findInstagramBusinessAccountId(tokenData.access_token);

  await saveAdPlatformTokens(verified.restaurantId, "instagram", {
    accessToken: tokenData.access_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined,
    externalAccountId: instagramBusinessAccountId ?? undefined,
  });

  settingsUrl.searchParams.set("ads_connected", "instagram");
  if (!instagramBusinessAccountId) {
    settingsUrl.searchParams.set("instagram_needs_page_link", "1");
  }
  return NextResponse.redirect(settingsUrl);
}
