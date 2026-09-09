import { NextResponse } from "next/server";
import { resolveTouchpointByCode, recordTouchpointEvent } from "@/lib/data/physical-touchpoints";
import { getLoyaltyShareByToken } from "@/lib/data/loyalty-shares";
import { getMenuShareByToken } from "@/lib/data/menu-shares";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Native counterpart to app/[locale]/t/[code]/route.ts's web redirect —
 * called when a Universal Link tap opens the app directly instead of
 * Safari (see DeepLinkRouter.swift's NSUserActivityTypeBrowsingWeb
 * handling). Deliberately public (no resolveNativeCustomer bearer-token
 * check): a touchpoint tap is exactly how a NON-customer is meant to
 * discover a restaurant in the first place, same as the web route it
 * mirrors requiring no session either.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`touchpoint-tap:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const resolved = await resolveTouchpointByCode(code);
  if (!resolved) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { touchpoint, isExternal } = resolved;
  await recordTouchpointEvent(touchpoint.id, "touchpoint_opened", {
    user_agent: req.headers.get("user-agent"),
    source: "native_universal_link",
  });

  if (isExternal) {
    if (touchpoint.destinationKind === "review") {
      await recordTouchpointEvent(touchpoint.id, "review_flow_started");
    }
    return NextResponse.json({ kind: "external", url: touchpoint.destinationValue });
  }

  if (touchpoint.destinationKind === "loyalty_join") {
    const landing = await getLoyaltyShareByToken(touchpoint.destinationValue);
    if (!landing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      kind: "restaurant",
      restaurantId: landing.restaurantId,
      restaurantName: landing.restaurantName,
    });
  }

  if (touchpoint.destinationKind === "menu") {
    const landing = await getMenuShareByToken(touchpoint.destinationValue);
    if (!landing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      kind: "restaurant",
      restaurantId: landing.restaurantId,
      restaurantName: landing.restaurantName,
    });
  }

  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
