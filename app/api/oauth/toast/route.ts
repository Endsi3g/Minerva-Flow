import { NextResponse } from "next/server";
import { isToastConfigured, toastConnectAuthorizeUrl, posOauthRedirectUri } from "@/lib/pos/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getCurrentMembership } from "@/lib/data/current-restaurant";

export async function GET(req: Request) {
  if (!isToastConfigured()) {
    return NextResponse.json(
      { error: "Toast POS n'est pas encore configuré (TOAST_CLIENT_ID / TOAST_CLIENT_SECRET manquants)." },
      { status: 503 }
    );
  }

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const state = signOAuthState(membership.restaurantId);

  const authorizeUrl = new URL(toastConnectAuthorizeUrl());
  authorizeUrl.searchParams.set("client_id", process.env.TOAST_CLIENT_ID!);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", posOauthRedirectUri("toast", origin));
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}
