import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { submitPublicServiceQuote, type PublicServiceQuoteInput } from "@/lib/data/service-quotes";
import { createAdminClient } from "@/lib/supabase/admin";

/** Lists only quote requests already linked to the verified native customer. */
export async function GET(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("service_quotes")
    .select("id, restaurant_id, quote_type, status, event_at, guest_count, fulfillment_mode, currency, subtotal, tax_amount, total, deposit_percent, deposit_amount, expires_at, checkout_url, owner_notes, converted_order_id")
    .eq("customer_id", customer.id)
    .eq("restaurant_id", customer.restaurantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) {
    console.error("Native service quote history unavailable:", error?.code ?? "unknown");
    return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }

  const quoteIds = data.map((quote) => quote.id);
  const linesByQuote = new Map<string, Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
  }>>();
  if (quoteIds.length > 0) {
    const { data: lines, error: linesError } = await admin.from("service_quote_lines")
      .select("id, quote_id, name, description, quantity, unit_price, sort_order")
      .in("quote_id", quoteIds)
      .order("sort_order", { ascending: true });
    if (linesError || !lines) {
      console.error("Native service quote lines unavailable:", linesError?.code ?? "unknown");
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
    }
    for (const line of lines) {
      const rows = linesByQuote.get(line.quote_id) ?? [];
      rows.push({
        id: line.id,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
      });
      linesByQuote.set(line.quote_id, rows);
    }
  }

  const orderIds = [...new Set(data.map((quote) => quote.converted_order_id).filter((id): id is string => typeof id === "string"))];
  const orderState = new Map<string, { orderStatus: string | null; paymentStatus: string | null }>();
  if (orderIds.length > 0) {
    const { data: orders, error: ordersError } = await admin.from("orders")
      .select("id, status, payment_status")
      .eq("restaurant_id", customer.restaurantId)
      .eq("customer_id", customer.id)
      .in("id", orderIds);
    if (ordersError || !orders) {
      console.error("Native service quote order statuses unavailable:", ordersError?.code ?? "unknown");
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
    }
    for (const order of orders) {
      orderState.set(order.id, { orderStatus: order.status, paymentStatus: order.payment_status });
    }
  }

  const quotes = data.map((quote) => ({
    id: quote.id,
    quote_type: quote.quote_type,
    status: quote.status === "quoted" && quote.expires_at && Date.parse(quote.expires_at) <= Date.now() ? "expired" : quote.status,
    event_at: quote.event_at,
    guest_count: quote.guest_count,
    fulfillment_mode: quote.fulfillment_mode,
    currency: quote.currency,
    subtotal: quote.subtotal,
    tax_amount: quote.tax_amount,
    total: quote.total,
    deposit_percent: quote.deposit_percent,
    deposit_amount: quote.deposit_amount,
    expires_at: quote.expires_at,
    checkout_url: quote.checkout_url,
    owner_notes: quote.owner_notes,
    service_quote_lines: linesByQuote.get(quote.id) ?? [],
    order_status: quote.converted_order_id ? orderState.get(quote.converted_order_id)?.orderStatus ?? null : null,
    payment_status: quote.converted_order_id ? orderState.get(quote.converted_order_id)?.paymentStatus ?? null : null,
  }));
  return NextResponse.json({ quotes });
}

/** Authenticated native bridge for custom-meal and catering quote requests. */
export async function POST(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  let body: Partial<PublicServiceQuoteInput>;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
      return NextResponse.json({ ok: false, reason: "request_too_large" }, { status: 413 });
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
    }
    body = parsed as Partial<PublicServiceQuoteInput>;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  if (body.quoteType !== "custom_meal" && body.quoteType !== "catering") {
    return NextResponse.json({ ok: false, reason: "invalid_quote_type" }, { status: 400 });
  }
  if (body.fulfillmentMode !== "sur_place" && body.fulfillmentMode !== "livraison") {
    return NextResponse.json({ ok: false, reason: "invalid_fulfillment_mode" }, { status: 400 });
  }

  const input: PublicServiceQuoteInput = {
    quoteType: body.quoteType,
    guestName: typeof body.guestName === "string" ? body.guestName : customer.name,
    guestPhone: typeof body.guestPhone === "string" ? body.guestPhone : customer.phone ?? "",
    guestEmail: typeof body.guestEmail === "string" ? body.guestEmail : customer.email ?? "",
    description: typeof body.description === "string" ? body.description : "",
    eventAtLocal: typeof body.eventAtLocal === "string" ? body.eventAtLocal : "",
    guestCount: typeof body.guestCount === "number" ? body.guestCount : null,
    fulfillmentMode: body.fulfillmentMode,
    deliveryAddress: typeof body.deliveryAddress === "string" ? body.deliveryAddress : null,
    clientNotes: typeof body.clientNotes === "string" ? body.clientNotes : null,
  };

  try {
    const result = await submitPublicServiceQuote(null, input, {
      restaurantId: customer.restaurantId,
      customerId: customer.id,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Native service quote submission failed:", error);
    return NextResponse.json({ ok: false, reason: "save_failed" }, { status: 500 });
  }
}
