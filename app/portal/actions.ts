"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
import { getCustomerForUser } from "@/lib/data/customer-portal";
import type { CustomerReferralLink } from "@/lib/types";

/**
 * customerId is never trusted from the client — always re-derived from the
 * session, same principle as requireRestaurantId() elsewhere in the app.
 */
export async function getOrCreateReferralLinkAction(programId: string): Promise<CustomerReferralLink | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const customer = await getCustomerForUser(user.id);
  if (!customer) return null;

  return getOrCreateReferralLink(customer.id, programId);
}
