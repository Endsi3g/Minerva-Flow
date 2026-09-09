import { NextResponse } from "next/server";
import { isCloverConfigured, cloverAuthBaseUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

export async function GET(req: Request) {
  if (!isCloverConfigured()) {
    return NextResponse.json(
      { error: "Clover n'est pas encore configuré (CLOVER_APP_ID / CLOVER_APP_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(`${cloverAuthBaseUrl()}/oauth/v2/authorize`);
  authorizeUrl.searchParams.set("client_id", process.env.CLOVER_APP_ID!);
  authorizeUrl.searchParams.set("redirect_uri", posOauthRedirectUri("clover", origin));
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}
