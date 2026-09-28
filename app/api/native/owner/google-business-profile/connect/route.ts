import { NextResponse } from "next/server";
import { GOOGLE_SCOPES, googleWorkspaceRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { signOAuthState } from "@/lib/ad-platforms/state";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google Business Profile n’est pas encore configuré sur ce serveur." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { restaurantId?: string } | null;
  const auth = await getNativeOwnerContext(request, body?.restaurantId ?? null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const state = signOAuthState(auth.context.restaurantId, `native:${auth.context.userId}`);
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", googleWorkspaceRedirectUri(new URL(request.url).origin));
  authorizeUrl.searchParams.set("scope", ["openid", "email", GOOGLE_SCOPES.business_profile].join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("include_granted_scopes", "true");

  return NextResponse.json({ authorizationUrl: authorizeUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
}
