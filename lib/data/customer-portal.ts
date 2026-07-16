import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, type CustomerRow, mapTransaction, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { mapLink, type CustomerReferralLinkRow } from "@/lib/data/customer-referrals";
import type { Customer, CustomerReferralLink, LoyaltyTransaction, ReferralProgram } from "@/lib/types";

/**
 * Finds the customer record for the currently authenticated portal user —
 * uses the session client (not admin) so the customers_select_own RLS
 * policy (auth.uid() = user_id) is the actual source of truth for "is this
 * really their own record", not just an application-level assumption.
 */
export async function getCustomerForUser(userId: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapCustomer(data as CustomerRow, []);
}

export type PortalReferralProgress = {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
};

export type PortalData = {
  transactions: LoyaltyTransaction[];
  programs: PortalReferralProgress[];
};

/**
 * Aggregates everything the portal dashboard shows. Runs entirely
 * server-side after getCustomerForUser has already verified (via RLS) that
 * the caller owns this customer record, so the admin client here is just a
 * convenience for the cross-restaurant-program joins, not a trust boundary.
 */
export async function getPortalData(customer: Customer): Promise<PortalData> {
  const admin = createAdminClient();

  const [{ data: txData }, { data: programRows }] = await Promise.all([
    admin
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    admin.from("referral_programs").select("*").eq("restaurant_id", customer.restaurantId).eq("active", true),
  ]);

  const transactions = ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction);
  const programs = ((programRows as ReferralProgramRow[]) ?? []).map(mapReferralProgram);

  let links: CustomerReferralLink[] = [];
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

  return {
    transactions,
    programs: programs.map((program) => ({
      program,
      link: links.find((l) => l.referralProgramId === program.id) ?? null,
    })),
  };
}
