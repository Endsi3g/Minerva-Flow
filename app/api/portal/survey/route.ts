import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSurveyResponseEmail } from "@/lib/email/resend";

/**
 * Bridge for the native app's SurveyView — there is no dedicated survey
 * table (responses are delivered by email only, per the original ask), so
 * this route's whole job is resolving the caller's restaurant name (same
 * admin-client-only reasoning as /api/portal/restaurant — no customer-safe
 * RLS on `restaurants`) and forwarding to sendSurveyResponseEmail. Native
 * can't call a Next.js server action directly, hence the bridge.
 */
export async function POST(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { rating?: number; comment?: string | null } | null;
  const rating = body?.rating;
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Note invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", customer.restaurantId)
    .single();

  const result = await sendSurveyResponseEmail({
    customerName: customer.name,
    customerEmail: customer.email,
    restaurantName: (restaurant?.name as string | undefined) ?? "Restaurant",
    rating,
    comment: body?.comment?.trim() || null,
  });

  return NextResponse.json({ ok: result.ok });
}
