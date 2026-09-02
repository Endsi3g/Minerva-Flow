import { NextResponse } from "next/server";
import { isQuickBooksConfigured, QUICKBOOKS_AUTHORIZE_URL, posOauthRedirectUri } from "@/lib/pos/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

// Accounting-only scope — enough to read expenses/purchases for the sync,
// no write access to the restaurant's actual QuickBooks ledger.
const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";

export async function GET(req: Request) {
  if (!isQuickBooksConfigured()) {
    return NextResponse.json(
      { error: "QuickBooks n'est pas encore configuré (QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(QUICKBOOKS_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", process.env.QUICKBOOKS_CLIENT_ID!);
  authorizeUrl.searchParams.set("scope", QUICKBOOKS_SCOPE);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", posOauthRedirectUri("quickbooks", origin));

  return NextResponse.redirect(authorizeUrl.toString());
}
