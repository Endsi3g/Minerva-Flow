import { NextResponse } from "next/server";
import { getReferralLandingByCode, recordClick } from "@/lib/data/customer-referrals";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Native counterpart to app/[locale]/p/[code]/page.tsx's web landing page
 * — called when a Universal Link tap opens the app directly instead of
 * Safari. Public, same as the web page: a referral link is exactly how a
 * non-customer is meant to first hear about the restaurant.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`referral-link:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const landing = await getReferralLandingByCode(code);
  if (!landing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await recordClick(code);

  return NextResponse.json({
    kind: "restaurant",
    restaurantId: landing.program.restaurantId,
    restaurantName: landing.restaurantName,
    referrerName: landing.referrerName,
    rewardDescription: landing.program.rewardDescription ?? null,
  });
}
