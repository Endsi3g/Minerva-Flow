import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getMenuShareByToken } from "@/lib/data/menu-shares";

/**
 * Resolves a physical table QR code (the same menu_shares token the web's
 * /m/[token] public ordering page already uses) to a restaurant id — the
 * native app's "Scanner un code" entry point reuses this instead of
 * building a second QR/token system. Same reasoning as
 * resolveNativeUserId elsewhere: scanning a table QR at a restaurant the
 * customer isn't a loyalty member of yet is the whole point, so no
 * customer row is required, only a valid authenticated app user.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { token } = await params;

  const landing = await getMenuShareByToken(token);
  if (!landing) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 404 });
  }

  return NextResponse.json({
    restaurantId: landing.restaurantId,
    restaurantName: landing.restaurantName,
  });
}
