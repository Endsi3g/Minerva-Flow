import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import type { CustomerReferralLink, ReferralProgram } from "@/lib/types";

export type ReferralLinkTracking = {
  link: CustomerReferralLink;
  programName: string;
  customerName: string;
};

/**
 * Flat, staff-facing view across every program's links for one restaurant —
 * powers the tracking table on /fidelisation ("où il a fait du
 * référencement"). Uses the session client: the customer_referral_links
 * select policy already allows any restaurant member to read rows joined
 * through referral_programs.restaurant_id.
 */
export async function getReferralLinksForRestaurant(restaurantId: string): Promise<ReferralLinkTracking[]> {
  const supabase = await createClient();
  const { data: programRows } = await supabase
    .from("referral_programs")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const programs = (programRows as { id: string; name: string }[]) ?? [];
  if (programs.length === 0) return [];
  const programNameById = new Map(programs.map((p) => [p.id, p.name]));

  const { data: linkRows } = await supabase
    .from("customer_referral_links")
    .select("*")
    .in("referral_program_id", programs.map((p) => p.id))
    .order("converted_count", { ascending: false });

  const links = ((linkRows as CustomerReferralLinkRow[]) ?? []).map(mapLink);
  if (links.length === 0) return [];

  const { data: customerRows } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", links.map((l) => l.customerId));
  const customerNameById = new Map(((customerRows as { id: string; name: string }[]) ?? []).map((c) => [c.id, c.name]));

  return links.map((link) => ({
    link,
    programName: programNameById.get(link.referralProgramId) ?? "—",
    customerName: customerNameById.get(link.customerId) ?? "—",
  }));
}

export type CustomerReferralLinkRow = {
  id: string;
  referral_program_id: string;
  customer_id: string;
  code: string;
  clicks: number;
  converted_count: number;
  reward_claimed_at: string | null;
  created_at: string;
};

export function mapLink(row: CustomerReferralLinkRow): CustomerReferralLink {
  return {
    id: row.id,
    referralProgramId: row.referral_program_id,
    customerId: row.customer_id,
    code: row.code,
    clicks: row.clicks,
    convertedCount: row.converted_count,
    rewardClaimedAt: row.reward_claimed_at,
    createdAt: row.created_at,
  };
}

/**
 * Reads/writes on this table always go through the admin client — a
 * customer authenticated via magic link is never a restaurant_members row,
 * so no RLS write policy exists for either side (see migration comment).
 */
export async function getOrCreateReferralLink(
  customerId: string,
  programId: string
): Promise<CustomerReferralLink | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("customer_referral_links")
    .select("*")
    .eq("customer_id", customerId)
    .eq("referral_program_id", programId)
    .maybeSingle();

  if (existing) return mapLink(existing as CustomerReferralLinkRow);

  const code = randomUUID().replace(/-/g, "").slice(0, 10);
  const { data, error } = await admin
    .from("customer_referral_links")
    .insert({ referral_program_id: programId, customer_id: customerId, code })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapLink(data as CustomerReferralLinkRow);
}

export type PublicReferralLanding = {
  link: CustomerReferralLink;
  program: ReferralProgram;
  restaurantName: string;
  referrerName: string;
};

export async function getReferralLandingByCode(code: string): Promise<PublicReferralLanding | null> {
  const admin = createAdminClient();
  const { data: linkRow } = await admin.from("customer_referral_links").select("*").eq("code", code).maybeSingle();
  if (!linkRow) return null;
  const link = mapLink(linkRow as CustomerReferralLinkRow);

  const [{ data: programRow }, { data: customerRow }] = await Promise.all([
    admin.from("referral_programs").select("*").eq("id", link.referralProgramId).maybeSingle(),
    admin.from("customers").select("name").eq("id", link.customerId).maybeSingle(),
  ]);
  if (!programRow) return null;
  const program = mapReferralProgram(programRow as ReferralProgramRow);
  if (!program.active) return null;

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", program.restaurantId)
    .maybeSingle();

  return {
    link,
    program,
    restaurantName: (restaurantRow as { name: string } | null)?.name ?? "ce restaurant",
    referrerName: (customerRow as { name: string } | null)?.name ?? "quelqu'un",
  };
}

/** Atomic increment (see migration) — no auth check by design, called anonymously from the public /p/[code] landing page. */
export async function recordClick(code: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("increment_referral_link_clicks", { p_code: code });
}

export type PublicReservationRequestInput = {
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  reservationTime: string;
};

/**
 * Called after the visitor has completed the magic-link step, so
 * auth.getUser() on the session client identifies them. Finds or creates
 * their own `customers` row for this restaurant (distinct from the
 * referrer's), inserts the reservation as 'demandee' (never
 * auto-confirmed), and logs an uncredited conversion — credited only once
 * staff confirms the reservation (see creditReferralConversion).
 */
export async function submitPublicReservationRequest(
  code: string,
  input: PublicReservationRequestInput
): Promise<boolean> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user?.email) return false;

  const admin = createAdminClient();
  const { data: linkRow } = await admin.from("customer_referral_links").select("*").eq("code", code).maybeSingle();
  if (!linkRow) return false;
  const link = mapLink(linkRow as CustomerReferralLinkRow);

  const { data: programRow } = await admin
    .from("referral_programs")
    .select("*")
    .eq("id", link.referralProgramId)
    .maybeSingle();
  if (!programRow) return false;
  const program = mapReferralProgram(programRow as ReferralProgramRow);

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("restaurant_id", program.restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = (existingCustomer as { id: string } | null)?.id ?? null;
  if (!customerId) {
    const { data: newCustomer, error: customerError } = await admin
      .from("customers")
      .insert({
        restaurant_id: program.restaurantId,
        name: input.guestName,
        email: user.email,
        phone: input.guestPhone,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (customerError || !newCustomer) return false;
    customerId = (newCustomer as { id: string }).id;
  }

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      restaurant_id: program.restaurantId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      party_size: input.partySize,
      reservation_time: input.reservationTime,
      status: "demandee",
      is_public_request: true,
      customer_id: customerId,
      referral_link_id: link.id,
    })
    .select("id")
    .single();

  if (reservationError || !reservation) return false;

  await admin.from("customer_referral_conversions").insert({
    referral_link_id: link.id,
    conversion_type: "reservation",
    reservation_id: (reservation as { id: string }).id,
  });

  return true;
}

/**
 * Called when staff confirms/honors a reservation tied to a referral link
 * (app/(app)/reservations/actions.ts). The whole operation — mark the
 * conversion credited, bump the link's converted_count, unlock the reward
 * once the program's goal is reached (display only — staff hands it over
 * manually) — runs atomically in a single SQL function (see migration),
 * row-locked against a double-credit if the reservation's status is
 * changed twice in quick succession. Uses the session client (not the
 * admin client) so the function's internal is_restaurant_member() check
 * evaluates against the real caller.
 */
export async function creditReferralConversion(reservationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("credit_referral_conversion", { p_reservation_id: reservationId });
}
