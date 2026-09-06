import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { mapLink, getOrCreateReferralLink, type CustomerReferralLinkRow } from "@/lib/data/customer-referrals";

/**
 * Bridge for the native app's referral/parrainage section — referral_programs
 * has no customer-facing RLS policy (referral_programs_select requires
 * is_restaurant_member, and a loyalty customer never is one), same reason
 * the web portal's own getPortalData already reads it through the admin
 * client rather than the session-scoped one. This mirrors that function's
 * program+link join, reached over a Bearer token instead of a session
 * cookie.
 */
export async function GET(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: programRows } = await admin
    .from("referral_programs")
    .select("*")
    .eq("restaurant_id", customer.restaurantId)
    .eq("active", true);

  const programs = ((programRows as ReferralProgramRow[]) ?? []).map(mapReferralProgram);

  let links: ReturnType<typeof mapLink>[] = [];
  if (programs.length > 0) {
    const { data: linkRows } = await admin
      .from("customer_referral_links")
      .select("*")
      .eq("customer_id", customer.id)
      .in(
        "referral_program_id",
        programs.map((p) => p.id)
      );
    links = ((linkRows as CustomerReferralLinkRow[]) ?? []).map(mapLink);
  }

  return NextResponse.json({
    programs: programs.map((program) => ({
      program,
      link: links.find((l) => l.referralProgramId === program.id) ?? null,
    })),
  });
}

/**
 * Creates (or returns the existing) referral link for one program — same
 * getOrCreateReferralLink the web portal's getOrCreateReferralLinkAction
 * calls. customerId is never taken from the client; resolveNativeCustomer
 * already ties this request to exactly one customer row.
 */
export async function POST(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { programId?: string } | null;
  if (!body?.programId) {
    return NextResponse.json({ error: "programId requis" }, { status: 400 });
  }

  const link = await getOrCreateReferralLink(customer.id, body.programId);
  if (!link) {
    return NextResponse.json({ error: "Impossible de créer le lien" }, { status: 500 });
  }
  return NextResponse.json({ link });
}
