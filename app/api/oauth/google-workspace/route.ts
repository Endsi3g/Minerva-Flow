import { NextResponse } from "next/server";
import { GOOGLE_SCOPES, isGoogleConfigured, googleWorkspaceRedirectUri, type GoogleFeature } from "@/lib/google/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

const GOOGLE_OAUTH_DIALOG = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google n'est pas encore configuré (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const url = new URL(req.url);
  const requestedFeatures = url.searchParams.getAll("feature") as GoogleFeature[];
  const validFeatures = requestedFeatures.filter((f) => f in GOOGLE_SCOPES);
  if (validFeatures.length === 0) {
    return NextResponse.json({ error: "Aucune fonctionnalité sélectionnée." }, { status: 400 });
  }

  const scopes = ["openid", "email", ...validFeatures.map((f) => GOOGLE_SCOPES[f])];
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(GOOGLE_OAUTH_DIALOG);
  authorizeUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", googleWorkspaceRedirectUri(url.origin));
  authorizeUrl.searchParams.set("scope", scopes.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl.toString());
}
