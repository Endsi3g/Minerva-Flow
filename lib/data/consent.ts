import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/phone";
import { recordLifecycleEvent } from "@/lib/data/lifecycle-events";

export type ConsentType = "service" | "marketing";
export type ConsentStatus = "opt_in" | "opt_out";
export type ConsentSource =
  | "qr_code"
  | "pos_cashier"
  | "website"
  | "portal"
  | "share_link"
  | "sms_keyword"
  | "unsubscribe_link"
  | "staff";

export const SERVICE_CONSENT_TEXT =
  "J’accepte de recevoir les communications nécessaires à l’utilisation de mon compte Minerva Flow.";

export function getMarketingConsentText(restaurantName: string): string {
  const name = restaurantName.trim() || "l’établissement";
  return `J’accepte de recevoir des offres et communications marketing de la part de ${name} par SMS et courriel. Je peux me désabonner à tout moment.`;
}

export type CustomerConsentRecord = {
  id: string;
  customerId: string;
  restaurantId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  channels: ("email" | "sms")[];
  consentText: string;
  consentSource: ConsentSource;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type RecordConsentParams = {
  customerId: string;
  restaurantId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  channels?: ("email" | "sms")[];
  consentText: string;
  consentSource: ConsentSource;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Appends an immutable audit log entry for Canadian CASL/LCAP legal compliance.
 */
export async function recordConsentAudit(
  params: RecordConsentParams,
  customClient?: any
): Promise<CustomerConsentRecord | null> {
  const client = customClient ?? (await createClient());

  const { data, error } = await client
    .from("customer_consents")
    .insert({
      customer_id: params.customerId,
      restaurant_id: params.restaurantId,
      consent_type: params.consentType,
      status: params.status,
      channels: params.channels ?? ["email", "sms"],
      consent_text: params.consentText,
      consent_source: params.consentSource,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to record customer consent audit:", error);
    return null;
  }

  return {
    id: data.id,
    customerId: data.customer_id,
    restaurantId: data.restaurant_id,
    consentType: data.consent_type as ConsentType,
    status: data.status as ConsentStatus,
    channels: data.channels as ("email" | "sms")[],
    consentText: data.consent_text,
    consentSource: data.consent_source as ConsentSource,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
  };
}

/**
 * Records customer opt-in with CASL compliance and synchronizes customer table flags.
 */
export async function recordCustomerOptIn(
  params: {
    customerId: string;
    restaurantId: string;
    restaurantName: string;
    marketingConsent: boolean;
    consentSource: ConsentSource;
    channels?: ("email" | "sms")[];
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  customClient?: any
): Promise<void> {
  const client = customClient ?? (await createClient());

  // 1. Mandatory Service consent audit log
  await recordConsentAudit(
    {
      customerId: params.customerId,
      restaurantId: params.restaurantId,
      consentType: "service",
      status: "opt_in",
      channels: params.channels ?? ["email", "sms"],
      consentText: SERVICE_CONSENT_TEXT,
      consentSource: params.consentSource,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    client
  );

  // 2. Optional Marketing consent audit log
  if (params.marketingConsent) {
    await recordConsentAudit(
      {
        customerId: params.customerId,
        restaurantId: params.restaurantId,
        consentType: "marketing",
        status: "opt_in",
        channels: params.channels ?? ["email", "sms"],
        consentText: getMarketingConsentText(params.restaurantName),
        consentSource: params.consentSource,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      client
    );
  }

  // 3. Sync customer profile flags
  await client
    .from("customers")
    .update({
      marketing_consent: params.marketingConsent,
      consent_source: params.consentSource,
      consent_at: params.marketingConsent ? new Date().toISOString() : null,
    })
    .eq("id", params.customerId);

  // 4. Record lifecycle event for consent
  if (params.marketingConsent) {
    await recordLifecycleEvent(
      {
        restaurantId: params.restaurantId,
        customerId: params.customerId,
        eventType: "sms_consent_given",
        metadata: {
          channels: params.channels ?? ["email", "sms"],
          source: params.consentSource,
        },
      },
      client
    );
  }
}

/**
 * Records customer opt-out (Unsubscribe / STOP / ARRÊT) and revokes marketing consent immediately.
 */
export async function recordCustomerOptOut(
  params: {
    customerId: string;
    restaurantId: string;
    consentSource: ConsentSource;
    reason?: string;
    ipAddress?: string | null;
  },
  customClient?: any
): Promise<boolean> {
  const client = customClient ?? createAdminClient();

  // 1. Log opt-out event in audit table
  await recordConsentAudit(
    {
      customerId: params.customerId,
      restaurantId: params.restaurantId,
      consentType: "marketing",
      status: "opt_out",
      channels: ["email", "sms"],
      consentText: `Retrait du consentement marketing (${params.reason || params.consentSource})`,
      consentSource: params.consentSource,
      ipAddress: params.ipAddress,
    },
    client
  );

  // Record lifecycle event for unsubscribe
  await recordLifecycleEvent(
    {
      restaurantId: params.restaurantId,
      customerId: params.customerId,
      eventType: "unsubscribed",
      metadata: {
        source: params.consentSource,
        reason: params.reason,
      },
    },
    client
  );

  // 2. Revoke marketing consent on customer record
  const { error } = await client
    .from("customers")
    .update({
      marketing_consent: false,
    })
    .eq("id", params.customerId);

  return !error;
}

/**
 * Handles inbound SMS keywords (STOP, ARRÊT, ARRET, UNSUBSCRIBE) to unsubscribe a phone number.
 */
export async function handleSmsInboundKeyword(
  rawPhone: string,
  messageText: string
): Promise<{ success: boolean; action: "opt_out" | "unknown"; customerCount: number }> {
  const clean = messageText.trim().toUpperCase();
  const optOutKeywords = ["STOP", "ARRET", "ARRÊT", "STOPALL", "UNSUBSCRIBE", "QUIT", "END"];

  if (!optOutKeywords.includes(clean)) {
    return { success: true, action: "unknown", customerCount: 0 };
  }

  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return { success: false, action: "unknown", customerCount: 0 };

  const admin = createAdminClient();

  // Find all customer records associated with this phone across restaurants
  const { data: customers } = await admin
    .from("customers")
    .select("id, restaurant_id")
    .eq("phone", normalized);

  const matched = (customers ?? []) as { id: string; restaurant_id: string }[];

  for (const c of matched) {
    await recordCustomerOptOut(
      {
        customerId: c.id,
        restaurantId: c.restaurant_id,
        consentSource: "sms_keyword",
        reason: `Mot-clé SMS reçu : ${clean}`,
      },
      admin
    );
  }

  return { success: true, action: "opt_out", customerCount: matched.length };
}

/**
 * Fetches consent statistics for a restaurant (for CASL compliance badges).
 */
export async function getRestaurantConsentStats(restaurantId: string): Promise<{
  totalCustomers: number;
  marketingOptInCount: number;
  serviceOnlyCount: number;
}> {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, marketing_consent")
    .eq("restaurant_id", restaurantId);

  const list = (customers ?? []) as { id: string; marketing_consent: boolean }[];
  const totalCustomers = list.length;
  const marketingOptInCount = list.filter((c) => c.marketing_consent).length;
  const serviceOnlyCount = totalCustomers - marketingOptInCount;

  return {
    totalCustomers,
    marketingOptInCount,
    serviceOnlyCount,
  };
}
