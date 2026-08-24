import { NextResponse } from "next/server";
import { isLightspeedConfigured, lightspeedAuthBaseUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

// Read-only scopes sufficient for pulling daily sales — widen only if a
// write use case shows up. financial-api backs the sales-daily endpoint;
// orders-api is requested too since some accounts gate financial-api
// behind also requesting it (per docs — unverified against a live app).
const LIGHTSPEED_SCOPE = "financial-api orders-api";

export async function GET(req: Request) {
  if (!isLightspeedConfigured()) {
    return NextResponse.json(
      { error: "Lightspeed n'est pas encore configuré (LIGHTSPEED_APPLICATION_ID / LIGHTSPEED_APPLICATION_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(`${lightspeedAuthBaseUrl()}/auth`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", process.env.LIGHTSPEED_APPLICATION_ID!);
  authorizeUrl.searchParams.set("scope", LIGHTSPEED_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", posOauthRedirectUri("lightspeed", origin));

  return NextResponse.redirect(authorizeUrl.toString());
}
