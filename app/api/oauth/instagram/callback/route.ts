import { NextResponse } from "next/server";
import {
  getInstagramAppId,
  getInstagramAppSecret,
  oauthRedirectUri,
} from "@/lib/ad-platforms/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveAdPlatformTokens } from "@/lib/data/ad-platforms";

const GRAPH_VERSION = "v21.0";
const META_FACEBOOK_TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const INSTAGRAM_DIRECT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_DIRECT_LONG_LIVED_URL = "https://graph.instagram.com/access_token";

/**
 * Legacy flow: Finds the Instagram professional account linked to one of the user's
 * Facebook Pages when using Facebook Login for Business.
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
  const rawCode = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!rawCode || !state) {
    settingsUrl.searchParams.set("ads_error", "instagram_missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  // Meta notes: The "#_" appended to the end of the redirect URI is not part of the code
  const code = rawCode.replace(/#_.*$/, "").replace(/#.*$/, "");

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("ads_error", "instagram_invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const mode = verified.extra === "facebook" ? "facebook" : "direct";
  const redirectUri = oauthRedirectUri("instagram", url.origin);

  if (mode === "direct") {
    // ── Official Business Login for Instagram ──
    const appId = getInstagramAppId();
    const appSecret = getInstagramAppSecret();

    if (!appId || !appSecret) {
      settingsUrl.searchParams.set("ads_error", "instagram_not_configured");
      return NextResponse.redirect(settingsUrl);
    }

    // Step 2: Exchange authorization code for short-lived user access token
    const formData = new URLSearchParams();
    formData.set("client_id", appId);
    formData.set("client_secret", appSecret);
    formData.set("grant_type", "authorization_code");
    formData.set("redirect_uri", redirectUri);
    formData.set("code", code);

    const tokenRes = await fetch(INSTAGRAM_DIRECT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!tokenRes.ok) {
      settingsUrl.searchParams.set("ads_error", "instagram_token_exchange_failed");
      return NextResponse.redirect(settingsUrl);
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken: string | undefined =
      tokenData.access_token || tokenData.data?.[0]?.access_token;
    const userId: string | undefined =
      tokenData.user_id ? String(tokenData.user_id) : tokenData.data?.[0]?.user_id ? String(tokenData.data[0].user_id) : undefined;

    if (!shortLivedToken) {
      settingsUrl.searchParams.set("ads_error", "instagram_no_access_token");
      return NextResponse.redirect(settingsUrl);
    }

    // Step 3: Exchange short-lived token for long-lived access token (valid 60 days)
    let finalAccessToken = shortLivedToken;
    let expiresInSec = 60 * 24 * 3600; // default 60 days in seconds

    try {
      const longLivedUrl = new URL(INSTAGRAM_DIRECT_LONG_LIVED_URL);
      longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
      longLivedUrl.searchParams.set("client_secret", appSecret);
      longLivedUrl.searchParams.set("access_token", shortLivedToken);

      const longLivedRes = await fetch(longLivedUrl.toString());
      if (longLivedRes.ok) {
        const longLivedData = await longLivedRes.json();
        if (longLivedData.access_token) {
          finalAccessToken = longLivedData.access_token;
          if (longLivedData.expires_in) {
            expiresInSec = Number(longLivedData.expires_in);
          }
        }
      }
    } catch {
      // If long-lived exchange fails, fallback to short-lived token
    }

    await saveAdPlatformTokens(verified.restaurantId, "instagram", {
      accessToken: finalAccessToken,
      expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
      externalAccountId: userId,
    });

    settingsUrl.searchParams.set("ads_connected", "instagram");
    return NextResponse.redirect(settingsUrl);
  } else {
    // ── Legacy Facebook Login for Business ──
    const tokenUrl = new URL(META_FACEBOOK_TOKEN_URL);
    tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!);
    tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
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
}
