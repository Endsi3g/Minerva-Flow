import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { resumePortalOrder, submitPortalOrder, type PortalOrderCartLine } from "@/lib/data/customer-portal";

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

  let body: {
    cart?: PortalOrderCartLine[];
    tipAmount?: number;
    paymentMethod?: string | null;
    payOnline?: boolean;
    delivery?: { address?: string };
    requestedReadyAtLocal?: string | null;
    idempotencyKey?: string;
    resumeOnly?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  }

  if (body.resumeOnly === true) {
    if (!body.idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.idempotencyKey)) {
      return NextResponse.json({ ok: false, error: "Identifiant de commande invalide" }, { status: 400 });
    }
    const result = await resumePortalOrder(customer, body.idempotencyKey);
    if (!result.ok) return NextResponse.json({ ok: false, error: "Commande introuvable ou non récupérable" }, { status: 404 });
    return NextResponse.json(result);
  }

  const cart = Array.isArray(body.cart) ? body.cart : [];
  if (cart.length === 0) {
    return NextResponse.json({ ok: false, error: "Le panier est vide" }, { status: 400 });
  }
  if (!body.idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "Identifiant de commande invalide" }, { status: 400 });
  }

  const delivery = body.delivery?.address?.trim()
    ? { address: body.delivery.address }
    : undefined;
  const result = await submitPortalOrder(
    customer,
    cart,
    body.tipAmount ?? 0,
    body.paymentMethod ?? null,
    body.idempotencyKey,
    "mobile",
    delivery,
    body.requestedReadyAtLocal ?? null,
    body.payOnline === true
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "La commande a échoué" }, { status: 500 });
  }
  return NextResponse.json(result);
}
