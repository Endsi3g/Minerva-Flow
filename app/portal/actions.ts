"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
import { getCustomersForUser } from "@/lib/data/customer-portal";
import type { CustomerReferralLink } from "@/lib/types";

/**
 * customerId is never trusted from the client — derived from the session
 * and matched to the program's own restaurant_id, so a person who is a
 * loyalty customer at more than one restaurant always gets a link tied to
 * the correct one instead of an arbitrary customer record.
 */
export async function getOrCreateReferralLinkAction(programId: string): Promise<CustomerReferralLink | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const customers = await getCustomersForUser(user.id);
  if (customers.length === 0) return null;

  const admin = createAdminClient();
  const { data: programRow } = await admin
    .from("referral_programs")
    .select("restaurant_id")
    .eq("id", programId)
    .maybeSingle();

  const restaurantId = (programRow as { restaurant_id: string } | null)?.restaurant_id;
  if (!restaurantId) return null;

  const customer = customers.find((c) => c.restaurantId === restaurantId);
  if (!customer) return null;

  return getOrCreateReferralLink(customer.id, programId);
}
