import { NextResponse } from "next/server";
import {
  isGoogleConfigured,
  memberCalendarRedirectUri,
  GOOGLE_CALENDAR_READONLY_SCOPE,
} from "@/lib/google/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_OAUTH_DIALOG = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Any active team member can connect their own calendar — unlike the
 * Workspace connection (owner/manager only, restaurant-wide), this is a
 * personal, read-only connection. signOAuthState's "restaurantId" param is
 * repurposed here to carry "userId:restaurantId" — same generic
 * HMAC-signed round-trip token, no need for a second signing helper.
 */
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google n'est pas encore configuré." }, { status: 503 });
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const url = new URL(req.url);
  const state = signOAuthState(`${user.id}:${membership.restaurantId}`);

  const authorizeUrl = new URL(GOOGLE_OAUTH_DIALOG);
  authorizeUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", memberCalendarRedirectUri(url.origin));
  authorizeUrl.searchParams.set("scope", ["openid", "email", GOOGLE_CALENDAR_READONLY_SCOPE].join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl.toString());
}
