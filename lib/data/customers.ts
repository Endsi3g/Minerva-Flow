import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import {
  getLoyaltyTier,
  loyaltyTierLabel,
  getVisitBonusMultiplier,
  DEFAULT_LOYALTY_TIER_THRESHOLDS,
} from "@/lib/loyalty-tiers";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { normalizePhoneNumber, getLocalPhoneDigits } from "@/lib/phone";
import type { Customer, LoyaltyReward, LoyaltyTransaction, LoyaltyTransactionType, VisitRewardTier } from "@/lib/types";

export type CustomerRow = {
  id: string;
  restaurant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  visit_count: number;
  total_spent: number;
  loyalty_points: number;
  last_visit_at: string | null;
  created_at: string;
  user_id: string | null;
  marketing_consent: boolean;
  consent_source: string | null;
  consent_at: string | null;
  birthday: string | null;
  city: string | null;
  avatar_url: string | null;
  favorite_offer_ids: string[] | null;
  favorite_menu_item_ids: string[] | null;
  pos_customer_id?: string | null;
};

export type LoyaltyTransactionRow = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  type: LoyaltyTransactionType;
  amount_spent: number | null;
  points_delta: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  via_pairing_code?: boolean | null;
  via_pos_sync?: boolean | null;
  via_phone_lookup?: boolean | null;
};

export function mapTransaction(row: LoyaltyTransactionRow): LoyaltyTransaction {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    type: row.type,
    amountSpent: row.amount_spent,
    pointsDelta: row.points_delta,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    viaPairingCode: !!row.via_pairing_code,
    viaPosSync: !!row.via_pos_sync,
    viaPhoneLookup: !!row.via_phone_lookup,
  };
}

export function mapCustomer(row: CustomerRow, transactions: LoyaltyTransaction[]): Customer {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    visitCount: row.visit_count,
    totalSpent: row.total_spent,
    loyaltyPoints: row.loyalty_points,
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
    transactions,
    userId: row.user_id,
    marketingConsent: row.marketing_consent,
    consentSource: row.consent_source,
    consentAt: row.consent_at,
    birthday: row.birthday,
    city: row.city,
    avatarUrl: row.avatar_url,
    favoriteOfferIds: row.favorite_offer_ids ?? [],
    favoriteMenuItemIds: row.favorite_menu_item_ids ?? [],
    posCustomerId: row.pos_customer_id ?? null,
  };
}

export async function getCustomers(restaurantId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");

  if (error || !data) return [];
  const rows = data as CustomerRow[];
  if (rows.length === 0) return [];

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .in("customer_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });

  const txByCustomer = new Map<string, LoyaltyTransaction[]>();
  for (const row of (txData as LoyaltyTransactionRow[]) ?? []) {
    const list = txByCustomer.get(row.customer_id) ?? [];
    list.push(mapTransaction(row));
    txByCustomer.set(row.customer_id, list);
  }

  return rows.map((row) => mapCustomer(row, txByCustomer.get(row.id) ?? []));
}

/** Single customer with full transaction history — for the dedicated /fidelisation/[id] page. */
export async function getCustomer(restaurantId: string, customerId: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId)
    .maybeSingle();

  if (!row) return null;

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(row as CustomerRow, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

export type CustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  marketingConsent?: boolean;
  consentSource?: string | null;
  birthday?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
};

export async function createCustomer(restaurantId: string, input: CustomerInput): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      marketing_consent: input.marketingConsent ?? false,
      consent_source: input.marketingConsent ? (input.consentSource ?? "staff") : null,
      consent_at: input.marketingConsent ? new Date().toISOString() : null,
      birthday: input.birthday ?? null,
      city: input.city ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "customer.create",
    entityType: "customer",
    entityId: data.id,
    description: `A ajouté la fiche client "${input.name}"`,
  });

  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    await recordLifecycleEvent(
      {
        restaurantId,
        customerId: data.id,
        eventType: "registration_completed",
        metadata: { name: input.name, source: input.consentSource ?? "staff" },
      },
      supabase
    );
  } catch {
    // Non-blocking
  }

  return mapCustomer(data as CustomerRow, []);
}

export async function updateCustomer(
  restaurantId: string,
  id: string,
  patch: Partial<CustomerInput>
): Promise<boolean> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.birthday !== undefined) dbPatch.birthday = patch.birthday;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
  if (patch.marketingConsent !== undefined) {
    dbPatch.marketing_consent = patch.marketingConsent;
    if (patch.marketingConsent) {
      dbPatch.consent_source = patch.consentSource ?? "staff";
      dbPatch.consent_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("customers")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id);

  return !error;
}

/**
 * The heart toggle on a menu item or offer (public menu / portal) — reads
 * the current array and writes the new one rather than an atomic RPC; a
 * lost update from two rapid clicks on the same favorite is low-stakes
 * enough not to warrant one.
 */
export async function toggleFavorite(
  restaurantId: string,
  customerId: string,
  kind: "menu_item" | "offer",
  itemId: string,
  favorite: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const column = kind === "menu_item" ? "favorite_menu_item_ids" : "favorite_offer_ids";

  const { data: current } = await supabase
    .from("customers")
    .select(column)
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId)
    .maybeSingle();
  if (!current) return false;

  const existing = ((current as Record<string, string[] | null>)[column] ?? []) as string[];
  const next = favorite ? Array.from(new Set([...existing, itemId])) : existing.filter((id) => id !== itemId);

  const { error } = await supabase
    .from("customers")
    .update({ [column]: next })
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId);

  return !error;
}

export async function deleteCustomer(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

/**
 * Logs a visit for a customer: computes points earned from the
 * restaurant's loyalty_points_per_dollar rate, inserts the ledger entry,
 * and bumps the customer's denormalized counters (visit_count, total_spent,
 * loyalty_points, last_visit_at) in the same call.
 */
export type LogVisitOptions = {
  viaPairingCode?: boolean;
  viaPosSync?: boolean;
  viaPhoneLookup?: boolean;
};

async function executeLogVisit(
  client: any,
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null,
  options: LogVisitOptions = {}
): Promise<Customer | null> {
  const { data: restaurant } = await client
    .from("restaurants")
    .select(
      "name, loyalty_points_per_dollar, loyalty_tier_2_threshold, loyalty_tier_3_threshold, visit_rewards_enabled, visit_reward_tiers"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  const restaurantRow = restaurant as {
    name: string;
    loyalty_points_per_dollar: number;
    loyalty_tier_2_threshold: number | null;
    loyalty_tier_3_threshold: number | null;
    visit_rewards_enabled: boolean | null;
    visit_reward_tiers: VisitRewardTier[] | null;
  } | null;
  const rate = restaurantRow?.loyalty_points_per_dollar ?? 1;
  const pointsEarned = Math.round(amountSpent * rate * getVisitBonusMultiplier(amountSpent));

  const { data: rpcRows, error: rpcError } = await client.rpc("increment_customer_visit", {
    p_customer_id: customerId,
    p_restaurant_id: restaurantId,
    p_amount_spent: amountSpent,
    p_points_delta: pointsEarned,
    p_note: note ?? null,
    p_via_pairing_code: !!options.viaPairingCode,
    p_via_pos_sync: !!options.viaPosSync,
    p_via_phone_lookup: !!options.viaPhoneLookup,
  });

  if (rpcError || !rpcRows || (rpcRows as CustomerRow[]).length === 0) return null;
  const customer = (rpcRows as CustomerRow[])[0];

  try {
    await logActivity({
      restaurantId,
      actionType: "customer.visit",
      entityType: "customer",
      entityId: customerId,
      description: `A enregistré une visite pour "${customer.name}" (${amountSpent}$, +${pointsEarned} pts)`,
    });
  } catch {
    // Activity logging shouldn't abort a successful visit record
  }

  // Lifecycle Events: 1st visit, 2nd visit, and 7-day post-campaign attribution
  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    if (customer.visit_count === 1) {
      await recordLifecycleEvent(
        {
          restaurantId,
          customerId,
          eventType: "first_visit_recognized",
          metadata: { amountSpent, pointsEarned, viaPosSync: Boolean(options.viaPosSync) },
        },
        client
      );
    } else if (customer.visit_count === 2) {
      await recordLifecycleEvent(
        {
          restaurantId,
          customerId,
          eventType: "second_visit_recognized",
          metadata: { amountSpent, pointsEarned, viaPosSync: Boolean(options.viaPosSync) },
        },
        client
      );
    }

    // 7-day post-campaign attribution check
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: recentCampaigns } = await client
      .from("customer_retention_sends")
      .select("trigger_type, sent_at")
      .eq("customer_id", customerId)
      .gte("sent_at", sevenDaysAgo)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (recentCampaigns && recentCampaigns.length > 0) {
      await recordLifecycleEvent(
        {
          restaurantId,
          customerId,
          eventType: "campaign_visit_generated",
          metadata: {
            amountSpent,
            pointsEarned,
            campaignTrigger: recentCampaigns[0].trigger_type,
            campaignSentAt: recentCampaigns[0].sent_at,
          },
        },
        client
      );
    }
  } catch {
    // Non-blocking
  }

  const tierThresholds = {
    tier2: restaurantRow?.loyalty_tier_2_threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier2,
    tier3: restaurantRow?.loyalty_tier_3_threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier3,
  };
  const tierBefore = getLoyaltyTier(customer.total_spent - amountSpent, tierThresholds);
  const tierAfter = getLoyaltyTier(customer.total_spent, tierThresholds);
  if (tierAfter !== tierBefore && restaurantRow) {
    const tierName = loyaltyTierLabel[tierAfter];
    const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
    if (customer.email) {
      try {
        await sendRetentionEmail({
          to: customer.email,
          subject: `${firstName}, vous passez au palier ${tierName} chez ${restaurantRow.name} !`,
          bodyHtml: `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Félicitations ${firstName} ! Vous venez de passer au palier <strong>${tierName}</strong> chez ${restaurantRow.name}. Consultez vos points et vos récompenses disponibles.</p>`,
        });
      } catch { }
    }
    if (customer.user_id) {
      try {
        await sendPushToUsers(
          [customer.user_id],
          { title: `Vous passez au palier ${tierName} !`, body: `${restaurantRow.name} vous récompense pour votre fidélité.`, link: "/portal" },
          restaurantId
        );
      } catch { }
    }
  }

  if (restaurantRow?.visit_rewards_enabled) {
    const visitBefore = customer.visit_count - 1;
    const visitAfter = customer.visit_count;
    const crossedTiers = (restaurantRow.visit_reward_tiers ?? []).filter(
      (t) => t.active !== false && visitBefore < t.visits && visitAfter >= t.visits
    );
    for (const tier of crossedTiers) {
      const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
      if (customer.email) {
        try {
          await sendRetentionEmail({
            to: customer.email,
            subject: `${firstName}, vous avez débloqué « ${tier.reward} » chez ${restaurantRow.name} !`,
            bodyHtml: `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Bravo ${firstName} ! Avec cette ${visitAfter}e visite chez ${restaurantRow.name}, vous débloquez <strong>${tier.reward}</strong>. Passez nous voir pour en profiter !</p>`,
          });
        } catch { }
      }
      try {
        await logActivity({
          restaurantId,
          actionType: "customer.visit_reward",
          entityType: "customer",
          entityId: customerId,
          description: `Récompense automatique débloquée pour "${customer.name}" — ${tier.reward} (${tier.label})`,
        });
      } catch { }

      try {
        const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
        await recordLifecycleEvent(
          {
            restaurantId,
            customerId,
            eventType: "reward_unlocked",
            metadata: {
              rewardName: tier.reward,
              tierLabel: tier.label,
              visitsRequired: tier.visits,
              visitCount: visitAfter,
            },
          },
          client
        );
      } catch { }
    }
  }

  const { data: txData } = await client
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(customer, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

/**
 * Logs a visit for a customer using the current user's authenticated session.
 */
export async function logVisit(
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null,
  optionsOrViaPairingCode: boolean | LogVisitOptions = false
): Promise<Customer | null> {
  const supabase = await createClient();
  const options: LogVisitOptions = typeof optionsOrViaPairingCode === "boolean"
    ? { viaPairingCode: optionsOrViaPairingCode }
    : optionsOrViaPairingCode;
  return executeLogVisit(supabase, restaurantId, customerId, amountSpent, note, options);
}

/**
 * Logs a visit using the admin client (used for background POS ticket ingestion / webhooks).
 */
export async function logVisitAdmin(
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null,
  options: LogVisitOptions = {}
): Promise<Customer | null> {
  const admin = createAdminClient();
  return executeLogVisit(admin, restaurantId, customerId, amountSpent, note, options);
}

/**
 * Resolves a customer by phone number within a restaurant (checks normalized E.164 and local digits).
 */
export async function findCustomerByPhone(
  restaurantId: string,
  rawPhone: string
): Promise<Customer | null> {
  const supabase = await createClient();
  return internalFindCustomerByPhone(supabase, restaurantId, rawPhone);
}

/**
 * Resolves a customer by phone number using the admin client (for background POS tasks).
 */
export async function findCustomerByPhoneAdmin(
  restaurantId: string,
  rawPhone: string
): Promise<Customer | null> {
  const admin = createAdminClient();
  return internalFindCustomerByPhone(admin, restaurantId, rawPhone);
}

async function internalFindCustomerByPhone(
  client: any,
  restaurantId: string,
  rawPhone: string
): Promise<Customer | null> {
  const normalized = normalizePhoneNumber(rawPhone);
  const localDigits = getLocalPhoneDigits(rawPhone);
  if (!normalized && !localDigits) return null;

  // 1. Direct match on normalized E.164 phone
  if (normalized) {
    const { data } = await client
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("phone", normalized)
      .maybeSingle();

    if (data) return mapCustomer(data as CustomerRow, []);
  }

  // 2. Direct match on raw input
  const { data: rawMatch } = await client
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("phone", rawPhone.trim())
    .maybeSingle();

  if (rawMatch) return mapCustomer(rawMatch as CustomerRow, []);

  // 3. Fallback scan on phone numbers ending with the local digits
  const { data: candidates } = await client
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .not("phone", "is", null)
    .limit(100);

  if (candidates && candidates.length > 0) {
    const targetDigits = localDigits || (normalized ? normalized.replace(/\D/g, "") : "");
    const matchedRow = (candidates as CustomerRow[]).find((c) => {
      if (!c.phone) return false;
      const cDigits = c.phone.replace(/\D/g, "");
      return cDigits.endsWith(targetDigits) || targetDigits.endsWith(cDigits);
    });
    if (matchedRow) return mapCustomer(matchedRow, []);
  }

  return null;
}

/**
 * Looks up an existing customer from POS ticket data or automatically creates a new customer profile.
 */
export async function findOrCreateCustomerFromPos(
  restaurantId: string,
  params: {
    phone?: string | null;
    email?: string | null;
    name?: string | null;
    externalCustomerId?: string | null;
  }
): Promise<{ customer: Customer; isNew: boolean } | null> {
  const admin = createAdminClient();

  // 1. Match by external POS customer ID if provided
  if (params.externalCustomerId) {
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("pos_customer_id", params.externalCustomerId)
      .maybeSingle();
    if (data) {
      return { customer: mapCustomer(data as CustomerRow, []), isNew: false };
    }
  }

  // 2. Match by phone if present
  if (params.phone) {
    const existing = await internalFindCustomerByPhone(admin, restaurantId, params.phone);
    if (existing) {
      if (params.externalCustomerId && !existing.posCustomerId) {
        await admin
          .from("customers")
          .update({ pos_customer_id: params.externalCustomerId })
          .eq("id", existing.id);
      }
      return { customer: existing, isNew: false };
    }
  }

  // 3. Match by email if present
  if (params.email?.trim()) {
    const { data: emailMatch } = await admin
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .ilike("email", params.email.trim())
      .maybeSingle();
    if (emailMatch) {
      return { customer: mapCustomer(emailMatch as CustomerRow, []), isNew: false };
    }
  }

  // 4. If neither phone nor email is provided, cannot create an identified member
  if (!params.phone && !params.email) {
    return null;
  }

  // 5. Auto-create new customer profile from POS checkout data
  const normalizedPhone = normalizePhoneNumber(params.phone) ?? params.phone;
  const guestName = params.name?.trim() || "Client Caisse";

  const { data: newRow, error } = await admin
    .from("customers")
    .insert({
      restaurant_id: restaurantId,
      name: guestName,
      phone: normalizedPhone ?? null,
      email: params.email?.trim() ?? null,
      pos_customer_id: params.externalCustomerId ?? null,
      consent_source: "pos_cashier",
      marketing_consent: true,
      consent_at: new Date().toISOString(),
      notes: "Créé automatiquement lors du passage en caisse",
    })
    .select("*")
    .single();

  if (error || !newRow) {
    console.error("Failed to auto-create customer from POS ticket:", error);
    return null;
  }

  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    await recordLifecycleEvent(
      {
        restaurantId,
        customerId: newRow.id,
        eventType: "registration_completed",
        metadata: {
          name: guestName,
          source: "pos_cashier_auto_create",
          hasPhone: Boolean(params.phone),
          hasEmail: Boolean(params.email),
        },
      },
      admin
    );
  } catch {
    // Non-blocking
  }

  return { customer: mapCustomer(newRow as CustomerRow, []), isNew: true };
}

/**
 * Redeems a reward for a customer, deducting points and logging the ledger
 * entry atomically (see increment_customer_visit comment — same pattern).
 * Returns null if the reward doesn't exist or the balance is insufficient
 * at the moment of the write (checked in the same SQL statement as the
 * deduction, so two concurrent redemptions can't both succeed off a stale
 * balance read).
 */
export async function redeemReward(
  restaurantId: string,
  customerId: string,
  rewardId: string
): Promise<Customer | null> {
  const supabase = await createClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc("redeem_customer_reward", {
    p_customer_id: customerId,
    p_restaurant_id: restaurantId,
    p_reward_id: rewardId,
  });

  if (rpcError || !rpcRows || (rpcRows as CustomerRow[]).length === 0) return null;
  const customer = (rpcRows as CustomerRow[])[0];

  const { data: rewardRow } = await supabase
    .from("loyalty_rewards")
    .select("name, points_cost")
    .eq("id", rewardId)
    .maybeSingle();
  const reward = rewardRow as { name: string; points_cost: number } | null;

  await logActivity({
    restaurantId,
    actionType: "customer.redeem",
    entityType: "customer",
    entityId: customerId,
    description: `A échangé "${reward?.name ?? "une récompense"}" pour "${customer.name}"${reward ? ` (-${reward.points_cost} pts)` : ""}`,
  });

  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    await recordLifecycleEvent(
      {
        restaurantId,
        customerId,
        eventType: "reward_redeemed",
        metadata: {
          rewardId,
          rewardName: reward?.name,
          pointsSpent: reward?.points_cost,
          source: "pos_or_dashboard_redeem",
        },
      },
      supabase
    );
  } catch {
    // Non-blocking
  }

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(customer, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

type LoyaltyRewardRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  active: boolean;
  created_at: string;
  menu_item_id: string | null;
};

export function mapReward(row: LoyaltyRewardRow): LoyaltyReward {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    pointsCost: row.points_cost,
    active: row.active,
    createdAt: row.created_at,
    menuItemId: row.menu_item_id,
  };
}

export async function getLoyaltyRewards(restaurantId: string): Promise<LoyaltyReward[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("points_cost");

  if (error || !data) return [];
  return (data as LoyaltyRewardRow[]).map(mapReward);
}

export async function createLoyaltyReward(
  restaurantId: string,
  input: { name: string; description?: string; pointsCost: number; menuItemId?: string | null }
): Promise<LoyaltyReward | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      description: input.description || null,
      points_cost: input.pointsCost,
      menu_item_id: input.menuItemId || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapReward(data as LoyaltyRewardRow);
}

export async function deleteLoyaltyReward(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("loyalty_rewards")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

type RewardRedemptionRpcRow = {
  id: string;
  reward_name: string;
  points_spent: number;
  customer_name: string;
  claimed_at: string;
};

/**
 * Staff validates a code the customer is showing in person (from their
 * self-serve redemption in /portal). The RPC itself enforces staff
 * membership and atomically flips pending -> claimed, so a double-tap on
 * an already-claimed code fails cleanly instead of "claiming" it twice.
 */
export async function claimRewardRedemption(
  restaurantId: string,
  code: string
): Promise<{ rewardName: string; pointsSpent: number; customerName: string; claimedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_claim_reward_redemption", {
    p_restaurant_id: restaurantId,
    p_code: code.trim(),
  });

  if (error || !data || (data as RewardRedemptionRpcRow[]).length === 0) return null;
  const row = (data as RewardRedemptionRpcRow[])[0];

  try {
    const { data: redemptionRow } = await supabase
      .from("reward_redemptions")
      .select("customer_id, reward_id")
      .eq("id", row.id)
      .maybeSingle();

    if (redemptionRow?.customer_id) {
      const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
      await recordLifecycleEvent(
        {
          restaurantId,
          customerId: redemptionRow.customer_id,
          eventType: "reward_redeemed",
          metadata: {
            rewardName: row.reward_name,
            pointsSpent: row.points_spent,
            redemptionId: row.id,
            rewardId: redemptionRow.reward_id,
            claimedAt: row.claimed_at,
            code: code.trim().toUpperCase(),
            source: "staff_counter_code",
          },
        },
        supabase
      );
    }
  } catch {
    // Non-blocking
  }

  return {
    rewardName: row.reward_name,
    pointsSpent: row.points_spent,
    customerName: row.customer_name,
    claimedAt: row.claimed_at,
  };
}

type PairingCodeRpcRow = {
  customer_id: string;
  customer_name: string;
  loyalty_points: number;
  visit_count: number;
  total_spent: number;
  avatar_url: string | null;
};

/**
 * Staff types the 6-digit rotating code a customer is showing on their
 * digital card (MyCardView, native app) to identify them without needing a
 * scan — see resolve_pairing_code in supabase/migrations/0086_pairing_codes.sql.
 * The RPC itself enforces staff membership, code validity/expiry, and that
 * the customer actually belongs to this restaurant, and marks the code used
 * atomically — this is a thin pass-through, same trust-boundary shape as
 * claimRewardRedemption above. Deliberately returns the RPC's own error
 * message rather than collapsing every failure to "code invalide": expired,
 * already-used, and not-a-member-here are different situations staff should
 * be told apart.
 */
export async function resolvePairingCode(
  restaurantId: string,
  code: string
): Promise<{ error: string } | { customer: { id: string; name: string; loyaltyPoints: number; visitCount: number; totalSpent: number; avatarUrl: string | null } }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_pairing_code", {
    p_restaurant_id: restaurantId,
    p_code: code.trim(),
  });

  if (error) return { error: error.message || "Code invalide." };
  const rows = data as PairingCodeRpcRow[] | null;
  if (!rows || rows.length === 0) return { error: "Code invalide." };
  const row = rows[0];
  return {
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      loyaltyPoints: row.loyalty_points,
      visitCount: row.visit_count,
      totalSpent: row.total_spent,
      avatarUrl: row.avatar_url,
    },
  };
}
