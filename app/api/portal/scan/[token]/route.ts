import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getMenuShareByToken } from "@/lib/data/menu-shares";
import { getLoyaltyShareByToken } from "@/lib/data/loyalty-shares";

/**
 * Resolves a physical QR code to a restaurant id — the native app's
 * "Scanner un code" entry point reuses whichever token system the printed
 * code actually belongs to instead of building a third one:
 *   - menu_shares (the web's /m/[token] public ordering page, a specific
 *     table's menu) — checked first since it's the more common table-QR
 *     case today.
 *   - loyalty_shares (the web's /f/[token] self-enrollment landing, the
 *     restaurant's own printed QR from the Studio QR & Affiches page) —
 *     checked as a fallback so scanning a restaurant's join/loyalty QR
 *     with Minerva's own in-app scanner works exactly like scanning a
 *     table QR, not just when opened in a browser.
 * Same reasoning as resolveNativeUserId elsewhere: scanning a QR at a
 * restaurant the customer isn't a loyalty member of yet is the whole
 * point, so no customer row is required, only a valid authenticated app
 * user.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { token } = await params;

  const menuLanding = await getMenuShareByToken(token);
  if (menuLanding) {
    return NextResponse.json({
      restaurantId: menuLanding.restaurantId,
      restaurantName: menuLanding.restaurantName,
    });
  }

  const loyaltyLanding = await getLoyaltyShareByToken(token);
  if (loyaltyLanding) {
    return NextResponse.json({
      restaurantId: loyaltyLanding.restaurantId,
      restaurantName: loyaltyLanding.restaurantName,
    });
  }

  return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 404 });
}
