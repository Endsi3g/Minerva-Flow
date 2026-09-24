"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
import {
  getCustomersForUser,
  selfRedeemReward,
  submitPortalOrder,
  resumePortalOrder,
  getPortalDeliveryQuote,
  deleteMyAccount,
  exportCustomerData,
  type PortalOrderCartLine,
  type SubmitPortalOrderResult,
} from "@/lib/data/customer-portal";
import { toggleFavorite } from "@/lib/data/customers";
import { updateCustomer } from "@/lib/data/customers";
import type { CustomerReferralLink, RewardRedemption } from "@/lib/types";
import type { DeliveryQuote } from "@/lib/orders/delivery-pricing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

/**
 * Lets a customer set their own marketing consent/birthday from the
 * portal — covers people who joined before these fields existed, or via
 * the staff-facing form which may not have asked. customerId is trusted
 * only after confirming it belongs to the authenticated session, same
 * pattern as getOrCreateReferralLinkAction.
 */
export async function updateMyProfileAction(
  customerId: string,
  input: {
    marketingConsent: boolean;
    birthday: string | null;
    city?: string | null;
    neighborhood?: string | null;
    name?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return false;

  return updateCustomer(customer.restaurantId, customer.id, {
    marketingConsent: input.marketingConsent,
    consentSource: "portal",
    birthday: input.birthday,
    city: input.city,
    neighborhood: input.neighborhood,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });
}

/**
 * The heart toggle on a menu item/offer (public menu + portal) — ownership
 * verified against the session's own customer records first, same pattern
 * as updateMyProfileAction, so a customer can never toggle another
 * customer's favorites by guessing a customerId.
 */
export async function toggleFavoriteAction(
  customerId: string,
  kind: "menu_item" | "offer",
  itemId: string,
  favorite: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return false;

  return toggleFavorite(customer.restaurantId, customer.id, kind, itemId, favorite);
}

/**
 * Loi 25 self-serve data export — customerId is verified against the
 * session's own customer records before anything is returned, same
 * ownership check as updateMyProfileAction, so a customer can never
 * request another customer's export by guessing an id.
 */
export async function exportMyDataAction(customerId: string): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return null;

  return exportCustomerData(customer);
}

/**
 * Supabase sends a confirmation link to the NEW address before the change
 * takes effect (auth.updateUser doesn't switch auth.users.email
 * immediately) — customers.email then syncs automatically once that link
 * is clicked (see supabase/migrations/0068_customer_profile_editing.sql's
 * on_auth_user_email_change trigger), so this action only needs to kick
 * off the request, never write customers.email itself.
 */
export async function requestEmailChangeAction(newEmail: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Self-serve reward redemption. rewardId is never trusted blindly — the
 * self_redeem_reward RPC re-derives the caller's own customer row from
 * auth.uid() and re-checks the points balance server-side, so this action
 * is just a thin pass-through, not the trust boundary.
 */
export async function selfRedeemRewardAction(rewardId: string): Promise<RewardRedemption | null> {
  return selfRedeemReward(rewardId);
}

/**
 * customerId is never trusted from the client — same ownership check as
 * updateMyProfileAction, so a portal order always lands under the correct
 * customer/restaurant even if the browser tab was left open on a stale id.
 */
export async function submitPortalOrderAction(
  customerId: string,
  cart: PortalOrderCartLine[],
  tipAmount: number,
  paymentMethod: string | null,
  idempotencyKey: string,
  requestedReadyAtLocal?: string | null,
  payOnline = false,
  delivery?: { address: string }
): Promise<SubmitPortalOrderResult> {
  if (!Array.isArray(cart) || cart.length === 0 || typeof idempotencyKey !== "string") return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return { ok: false };

  const result = await submitPortalOrder(customer, cart, tipAmount, paymentMethod, idempotencyKey, "web", delivery, requestedReadyAtLocal, payOnline);
  if (result.ok) revalidatePath("/portal");
  return result;
}

export async function resumePortalOrderAction(customerId: string, idempotencyKey: string): Promise<SubmitPortalOrderResult> {
  if (!customerId || typeof idempotencyKey !== "string") return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((entry) => entry.id === customerId);
  if (!customer) return { ok: false };
  return resumePortalOrder(customer, idempotencyKey);
}

export async function quoteMyDeliveryAction(customerId: string, address: string): Promise<DeliveryQuote> {
  const cleanAddress = address.trim();
  if (!customerId || cleanAddress.length < 6 || cleanAddress.length > 240) {
    return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "missing_location" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "disabled" };
  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((entry) => entry.id === customerId);
  if (!customer) return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "disabled" };
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`portal-delivery-quote:${ip}`, { max: 12, windowSeconds: 300 });
  if (!allowed) return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "missing_location" };
  try {
    return await getPortalDeliveryQuote(customer, cleanAddress);
  } catch (error) {
    console.error("quoteMyDeliveryAction failed:", error);
    return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "missing_location" };
  }
}

/**
 * Irreversible: wipes this session's own login and every customers row's
 * personal data tied to it (see deleteMyAccount's own doc comment). The
 * client is expected to have already confirmed with the person before
 * calling this — there is no further confirmation step here, this action
 * IS the point of no return.
 */
export async function deleteMyAccountAction(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  return deleteMyAccount(user.id);
}
