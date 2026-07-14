import { NextResponse } from "next/server";
import { googleWorkspaceRedirectUri } from "@/lib/google/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveGoogleTokens } from "@/lib/data/google-connections";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Decodes the `email` claim out of Google's id_token (JWT). No signature
 * verification needed — this token comes straight from Google's token
 * endpoint over a server-to-server HTTPS call, not from an untrusted
 * client, so there's nothing to verify against a forged token here.
 */
function decodeEmailFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.email === "string" ? json.email : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/settings", url.origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("google_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("google_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleWorkspaceRedirectUri(url.origin),
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("google_error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  };

  if (!tokenData.access_token) {
    settingsUrl.searchParams.set("google_error", "no_access_token");
    return NextResponse.redirect(settingsUrl);
  }

  await saveGoogleTokens(verified.restaurantId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined,
    connectedEmail: tokenData.id_token ? decodeEmailFromIdToken(tokenData.id_token) : undefined,
    scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
  });

  settingsUrl.searchParams.set("google_connected", "1");
  return NextResponse.redirect(settingsUrl);
}
