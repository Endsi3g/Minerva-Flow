import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { submitPortalOrder, type PortalOrderCartLine } from "@/lib/data/customer-portal";

/**
 * Bridge for the native app's checkout — submitPortalOrder is a
 * lib/data/*.ts function called from a Next.js Server Action on web
 * (submitPortalOrderAction), and Server Actions aren't reachable from a
 * native client at all (they're a Next.js/React Server Components
 * mechanism, not a public HTTP contract). This route is the same
 * function, reached over a Bearer token instead. Same defensive shape as
 * the action: an empty cart or malformed body both fail closed rather
 * than reaching submitPortalOrder with nothing to charge for.
 */
export async function POST(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  let body: { cart?: PortalOrderCartLine[]; tipAmount?: number; paymentMethod?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  }

  const cart = Array.isArray(body.cart) ? body.cart : [];
  if (cart.length === 0) {
    return NextResponse.json({ ok: false, error: "Le panier est vide" }, { status: 400 });
  }

  const result = await submitPortalOrder(customer, cart, body.tipAmount ?? 0, body.paymentMethod ?? null);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "La commande a échoué" }, { status: 500 });
  }
  return NextResponse.json(result);
}
