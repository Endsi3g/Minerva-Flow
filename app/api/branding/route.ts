import { NextResponse, type NextRequest } from "next/server";
import { normalizeRequestHost } from "@/lib/branding/request-branding";
import { getPublicWorkspaceBrandingByDomain } from "@/lib/data/workspace-branding";

/**
 * Returns only the public visual identity associated with the request host.
 * Used by unauthenticated surfaces (login, native bootstrap) before there is
 * a user session. A missing or unverified domain intentionally looks absent.
 */
export async function GET(request: NextRequest) {
  const host = normalizeRequestHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  if (!host) return NextResponse.json({ branding: null }, { headers: { "Cache-Control": "public, s-maxage=60" } });

  const branding = await getPublicWorkspaceBrandingByDomain(host);
  return NextResponse.json(
    { branding },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600", Vary: "Host" } }
  );
}
