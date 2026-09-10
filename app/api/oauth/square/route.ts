import { NextResponse } from "next/server";
import { isSquareConfigured, squareBaseUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

// Read scopes for sales/orders reporting, plus ITEMS_*/INVENTORY_* for the
// bidirectional menu + inventory catalog sync (lib/pos/catalog-sync.ts).
const SQUARE_SCOPE = "MERCHANT_PROFILE_READ ORDERS_READ PAYMENTS_READ ITEMS_READ ITEMS_WRITE INVENTORY_READ INVENTORY_WRITE";

export async function GET(req: Request) {
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { error: "Square n'est pas encore configuré (SQUARE_APPLICATION_ID / SQUARE_APPLICATION_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(`${squareBaseUrl()}/oauth2/authorize`);
  authorizeUrl.searchParams.set("client_id", process.env.SQUARE_APPLICATION_ID!);
  authorizeUrl.searchParams.set("scope", SQUARE_SCOPE);
  authorizeUrl.searchParams.set("session", "false");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", posOauthRedirectUri("square", origin));

  return NextResponse.redirect(authorizeUrl.toString());
}
