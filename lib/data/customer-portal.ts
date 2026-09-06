import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapReward, type CustomerRow, mapTransaction, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { mapLink, type CustomerReferralLinkRow } from "@/lib/data/customer-referrals";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { computeOrderPricing } from "@/lib/data/order-pricing";
import { notifyRestaurant } from "@/lib/data/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { formatCurrency } from "@/lib/utils";
import type {
  Customer,
  CustomerReferralLink,
  LoyaltyReward,
  LoyaltyTransaction,
  ReferralProgram,
  RewardRedemption,
} from "@/lib/types";

/**
 * Every customer record for the currently authenticated portal user — uses
 * the session client (not admin) so the customers_select_own RLS policy
 * (auth.uid() = user_id) is the actual source of truth for "is this really
 * their own record", not just an application-level assumption. Returns
 * every restaurant relationship rather than picking one: the same email
 * can be a loyalty customer at more than one participating restaurant, and
 * silently showing an arbitrary one would leak the wrong restaurant's data
 * into view. Callers decide what to do with more than one (see
 * app/portal/page.tsx for the chooser).
 */
export async function getCustomersForUser(userId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as CustomerRow[]).map((row) => mapCustomer(row, []));
}

export type PortalReferralProgress = {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
};

export type PortalData = {
  transactions: LoyaltyTransaction[];
  programs: PortalReferralProgress[];
  rewards: LoyaltyReward[];
  redemptions: RewardRedemption[];
};

type RewardRedemptionRow = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  reward_name: string;
  points_spent: number;
  code: string;
  status: "pending" | "claimed";
  created_at: string;
  claimed_at: string | null;
};

function mapRedemption(row: RewardRedemptionRow): RewardRedemption {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    pointsSpent: row.points_spent,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
  };
}

/**
 * Aggregates everything the portal dashboard shows. Runs entirely
 * server-side after getCustomerForUser has already verified (via RLS) that
 * the caller owns this customer record, so the admin client here is just a
 * convenience for the cross-restaurant-program joins, not a trust boundary.
 */
export async function getPortalData(customer: Customer): Promise<PortalData> {
  const admin = createAdminClient();

  const [{ data: txData }, { data: programRows }, { data: rewardRows }, { data: redemptionRows }] = await Promise.all([
    admin
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    admin.from("referral_programs").select("*").eq("restaurant_id", customer.restaurantId).eq("active", true),
    admin
      .from("loyalty_rewards")
      .select("*")
      .eq("restaurant_id", customer.restaurantId)
      .eq("active", true)
      .order("points_cost"),
    admin
      .from("reward_redemptions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  const transactions = ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction);
  const programs = ((programRows as ReferralProgramRow[]) ?? []).map(mapReferralProgram);
  const rewards = ((rewardRows as Parameters<typeof mapReward>[0][]) ?? []).map(mapReward);
  const redemptions = ((redemptionRows as RewardRedemptionRow[]) ?? []).map(mapRedemption);

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
    rewards,
    redemptions,
  };
}

/**
 * Self-serve redemption: the currently authenticated portal user spends
 * their own points for a reward via the self_redeem_reward RPC (which
 * resolves auth.uid() to their own customers row internally — no
 * customer id is ever taken from the client). Uses the session client,
 * not admin, since the RPC's own auth checks ARE the trust boundary here.
 */
export async function selfRedeemReward(rewardId: string): Promise<RewardRedemption | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("self_redeem_reward", { p_reward_id: rewardId });
  if (error || !data) return null;
  return mapRedemption(data as RewardRedemptionRow);
}

/**
 * Self-serve account deletion, callable from both the web portal (session
 * cookie, see actions.ts) and the native app (Bearer token, see
 * app/api/portal/account/route.ts) — userId is always the caller's own
 * auth.uid(), verified by each entry point before this runs, never taken
 * from client-supplied data.
 *
 * A hard `auth.admin.deleteUser` is the actual point of no return (profiles
 * cascades via its own FK, see 0001_init.sql). The customers rows are
 * anonymized rather than deleted outright first: a restaurant's own
 * visit/spend/redemption history is that restaurant's business record, not
 * something a customer erasing their *login* should be able to corrupt —
 * but the personally-identifying fields (name, email, birthday, city,
 * marketing consent, the user_id link itself) are wiped, so nothing here
 * still identifies the person once their account is gone.
 */
export async function deleteMyAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error: anonymizeError } = await admin
    .from("customers")
    .update({
      user_id: null,
      name: "Compte supprimé",
      email: null,
      birthday: null,
      city: null,
      marketing_consent: false,
      favorite_offer_ids: [],
    })
    .eq("user_id", userId);
  if (anonymizeError) return false;

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  return !deleteError;
}

export type PortalOrderCartLine = {
  menuItemId: string;
  quantity: number;
};

export type SubmitPortalOrderResult = { ok: false } | { ok: true; orderId: string };

/**
 * Pay-on-site ordering from an already-authenticated portal customer — the
 * order lands directly in the restaurant's own /commandes queue as
 * 'soumise', same entry point staff already use for a QR-code table order
 * (see submitPublicOrder in customer-referrals.ts). Online payment isn't
 * wired here: payment_status is always 'non_requis', staff collects
 * payment in person. `customer` is trusted here — the caller
 * (submitPortalOrderAction) has already confirmed the id belongs to the
 * authenticated session, same pattern as updateMyProfileAction.
 */
export async function submitPortalOrder(
  customer: Customer,
  cart: PortalOrderCartLine[],
  tipAmount: number,
  paymentMethod: string | null
): Promise<SubmitPortalOrderResult> {
  if (cart.length === 0) return { ok: false };

  // Same reasoning as submitPublicOrder — a scripted client calling this
  // action directly could otherwise create unlimited real orders.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`order-submit:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return { ok: false };

  const admin = createAdminClient();
  const [orderSettings, menuItemsResult] = await Promise.all([
    getRestaurantOrderSettings(admin, customer.restaurantId),
    admin
      .from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", customer.restaurantId)
      .eq("active", true)
      .in(
        "id",
        cart.map((l) => l.menuItemId)
      ),
  ]);
  if (!orderSettings) return { ok: false };

  const menuItemById = new Map(
    ((menuItemsResult.data as { id: string; name: string; price: number }[]) ?? []).map((r) => [r.id, r])
  );

  const pricing = computeOrderPricing({
    cart,
    menuItemById,
    taxRate: orderSettings.taxRate,
    acceptsTips: orderSettings.acceptsTips,
    requestedTipAmount: tipAmount,
  });
  if (!pricing) return { ok: false };
  const { lineItems, subtotal, taxAmount, tipAmount: appliedTip, total } = pricing;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      restaurant_id: customer.restaurantId,
      status: "soumise",
      guest_name: customer.name,
      guest_phone: customer.phone,
      subtotal,
      tax_amount: taxAmount,
      tip_amount: appliedTip,
      total,
      payment_method: paymentMethod,
      payment_status: "non_requis",
      is_public_request: true,
      customer_id: customer.id,
    })
    .select("id")
    .single();
  if (orderError || !order) return { ok: false };
  const orderId = (order as { id: string }).id;

  const { error: itemsError } = await admin.from("order_items").insert(
    lineItems.map((l) => ({
      order_id: orderId,
      menu_item_id: l.menuItemId,
      item_name: l.itemName,
      unit_price: l.unitPrice,
      quantity: l.quantity,
    }))
  );
  if (itemsError) return { ok: false };

  await notifyRestaurant({
    restaurantId: customer.restaurantId,
    type: "order.created",
    title: "Nouvelle commande — portail client",
    body: `${customer.name} — ${formatCurrency(total)}`,
    link: "/commandes",
  });

  return { ok: true, orderId };
}
