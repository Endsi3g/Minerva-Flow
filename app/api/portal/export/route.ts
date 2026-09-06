import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { exportCustomerData } from "@/lib/data/customer-portal";

/**
 * Native equivalent of the web portal's exportMyDataAction — same Loi 25
 * self-serve portability right, reached over a Bearer token instead of a
 * session cookie. resolveNativeCustomer already verifies (via RLS) that
 * the returned customer belongs to the caller, so there's no separate
 * ownership check needed here the way the web action has to do explicitly
 * against a client-supplied customerId.
 */
export async function GET(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data = await exportCustomerData(customer);
  return NextResponse.json(data);
}
