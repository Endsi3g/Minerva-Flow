import { NextResponse, type NextRequest } from "next/server";
import { resolveTouchpointByCode, recordTouchpointEvent } from "@/lib/data/physical-touchpoints";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * The short link printed/engraved on every physical touchpoint (NFC tag,
 * QR sticker, table chevalet). Deliberately a redirect, not a landing page
 * (per the /grill-me decision): it logs the tap, then sends the visitor
 * straight into the real existing flow (loyalty join, menu, or an external
 * review link) — never a bespoke explainer screen. review destinations also
 * log 'review_flow_started' immediately since there's no in-app page on the
 * other end to log it from.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`touchpoint-tap:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) return NextResponse.redirect(new URL("/portal", req.url));

  const resolved = await resolveTouchpointByCode(code);
  if (!resolved) return NextResponse.redirect(new URL("/portal", req.url));

  const { touchpoint, redirectPath, isExternal } = resolved;
  await recordTouchpointEvent(touchpoint.id, "touchpoint_opened", {
    user_agent: req.headers.get("user-agent"),
  });
  if (touchpoint.destinationKind === "review") {
    await recordTouchpointEvent(touchpoint.id, "review_flow_started");
  }

  return NextResponse.redirect(isExternal ? redirectPath : new URL(redirectPath, req.url));
}
