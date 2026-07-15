import { NextResponse } from "next/server";
import { memberCalendarRedirectUri } from "@/lib/google/config";
import { verifyOAuthState } from "@/lib/ad-platforms/state";
import { saveMemberCalendarTokens } from "@/lib/data/member-calendar";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

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
  const profilUrl = new URL("/profil", url.origin);

  if (!code || !state) {
    profilUrl.searchParams.set("calendar_error", "missing_params");
    return NextResponse.redirect(profilUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    profilUrl.searchParams.set("calendar_error", "invalid_state");
    return NextResponse.redirect(profilUrl);
  }

  const [userId, restaurantId] = verified.restaurantId.split(":");
  if (!userId || !restaurantId) {
    profilUrl.searchParams.set("calendar_error", "invalid_state");
    return NextResponse.redirect(profilUrl);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: memberCalendarRedirectUri(url.origin),
    }),
  });

  if (!tokenRes.ok) {
    profilUrl.searchParams.set("calendar_error", "token_exchange_failed");
    return NextResponse.redirect(profilUrl);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };
  if (!tokenData.access_token) {
    profilUrl.searchParams.set("calendar_error", "no_access_token");
    return NextResponse.redirect(profilUrl);
  }

  await saveMemberCalendarTokens(userId, restaurantId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
    googleEmail: tokenData.id_token ? decodeEmailFromIdToken(tokenData.id_token) : undefined,
  });

  profilUrl.searchParams.set("calendar_connected", "1");
  return NextResponse.redirect(profilUrl);
}
