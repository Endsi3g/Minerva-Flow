import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { getPortalDeliveryQuote } from "@/lib/data/customer-portal";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) return NextResponse.json({ ok: false }, { status: 401 });

  const { allowed } = await checkRateLimit(`native-delivery-quote:${await getClientIp()}`, { max: 8, windowSeconds: 300 });
  if (!allowed) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });

  let address: unknown;
  try {
    address = (await req.json())?.address;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  if (typeof address !== "string" || address.trim().length < 6 || address.length > 240) {
    return NextResponse.json({ ok: false, reason: "invalid_address" }, { status: 400 });
  }

  const quote = await getPortalDeliveryQuote(customer, address);
  return NextResponse.json({ ok: quote.available, quote });
}
