import { NextResponse } from "next/server";
import { resolveNativeUserContext } from "@/lib/auth/native-bearer";

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
  const verified = await resolveNativeUserContext(req);
  if (!verified) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { token } = await params;
  if (!token || token.length > 256) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 404 });
  }

  // Resolve only the exact, user-scanned token. The scoped database
  // function returns a restaurant's public id/name and never exposes the
  // share-token tables, restaurant financial columns, or admin credentials.
  const { data, error } = await verified.client.rpc("resolve_restaurant_connection", {
    p_token: token,
  });
  if (error) {
    console.error("resolve restaurant connection failed:", error.message);
    return NextResponse.json({ error: "Impossible de vérifier ce code" }, { status: 503 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.restaurant_id !== "string" || typeof result.restaurant_name !== "string") {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 404 });
  }

  return NextResponse.json({
    restaurantId: result.restaurant_id,
    restaurantName: result.restaurant_name,
    branding: null,
  });
}
