import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capturePostHogServerEvent } from "@/lib/posthog-server";

export type LifecycleEventType =
  | "qr_code_displayed"
  | "qr_code_scanned"
  | "form_started"
  | "registration_completed"
  | "sms_consent_given"
  | "first_visit_recognized"
  | "second_visit_recognized"
  | "reward_unlocked"
  | "reward_redeemed"
  | "campaign_sent"
  | "message_delivered"
  | "unsubscribed"
  | "campaign_visit_generated"
  | "referral_sent"
  | "referral_converted";

export const LIFECYCLE_EVENT_CONFIG: Record<
  LifecycleEventType,
  { label: string; description: string; stage: "acquisition" | "retention" | "loyalty" | "campaign" | "advocacy"; icon: string }
> = {
  qr_code_displayed: {
    label: "QR code affiché",
    description: "Affichage du stand physique ou de la carte de fidélité numérique.",
    stage: "acquisition",
    icon: "QrCode",
  },
  qr_code_scanned: {
    label: "QR code scanné",
    description: "Scan du QR code par le client depuis sa caméra ou son mobile.",
    stage: "acquisition",
    icon: "Scan",
  },
  form_started: {
    label: "Formulaire commencé",
    description: "Le client commence à renseigner ses coordonnées d'inscription.",
    stage: "acquisition",
    icon: "Edit3",
  },
  registration_completed: {
    label: "Inscription complétée",
    description: "Création du profil client et ouverture du compte de fidélité.",
    stage: "acquisition",
    icon: "UserCheck",
  },
  sms_consent_given: {
    label: "Consentement SMS donné",
    description: "Le membre accepte expressément de recevoir les offres par SMS (LCAP/CASL).",
    stage: "acquisition",
    icon: "ShieldCheck",
  },
  first_visit_recognized: {
    label: "Première visite reconnue",
    description: "Enregistrement du tout premier passage au comptoir ou en caisse.",
    stage: "retention",
    icon: "CheckCircle",
  },
  second_visit_recognized: {
    label: "Deuxième visite reconnue",
    description: "Le client revient une 2e fois — point de bascule de la rétention.",
    stage: "retention",
    icon: "Repeat",
  },
  reward_unlocked: {
    label: "Récompense débloquée",
    description: "Le client a cumulé suffisamment de points pour échanger un item.",
    stage: "loyalty",
    icon: "Gift",
  },
  reward_redeemed: {
    label: "Récompense échangée",
    description: "Validation d'un avantage ou produit offert en restaurant.",
    stage: "loyalty",
    icon: "Award",
  },
  campaign_sent: {
    label: "Campagne envoyée",
    description: "Déclenchement d'un message SMS ou courriel (Bienvenue, 21j, etc.).",
    stage: "campaign",
    icon: "Send",
  },
  message_delivered: {
    label: "Message livré",
    description: "Confirmation de transmission réussie auprès du client.",
    stage: "campaign",
    icon: "CheckCheck",
  },
  unsubscribed: {
    label: "Désinscription",
    description: "Retrait du consentement marketing via mot-clé STOP ou lien web.",
    stage: "campaign",
    icon: "UserX",
  },
  campaign_visit_generated: {
    label: "Visite générée après campagne",
    description: "Visite enregistrée dans les 7 jours suivant l'envoi d'une campagne.",
    stage: "campaign",
    icon: "TrendingUp",
  },
  referral_sent: {
    label: "Parrainage envoyé",
    description: "Partage d'un lien d'invitation par un client habitué.",
    stage: "advocacy",
    icon: "Share2",
  },
  referral_converted: {
    label: "Parrainage converti",
    description: "Le filleul invité effectue sa première visite dans l'établissement.",
    stage: "advocacy",
    icon: "Users",
  },
};

export type LifecycleEventRecord = {
  id: string;
  restaurantId: string;
  customerId: string | null;
  eventType: LifecycleEventType;
  touchpointId: string | null;
  campaignId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RecordLifecycleEventParams = {
  restaurantId: string;
  customerId?: string | null;
  eventType: LifecycleEventType;
  touchpointId?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Persists an immutable customer lifecycle event into Supabase and mirrors to PostHog.
 * Designed to never throw or block normal user operations.
 */
export async function recordLifecycleEvent(
  params: RecordLifecycleEventParams,
  customClient?: any
): Promise<LifecycleEventRecord | null> {
  try {
    const client = customClient ?? createAdminClient();

    const { data, error } = await client
      .from("lifecycle_events")
      .insert({
        restaurant_id: params.restaurantId,
        customer_id: params.customerId ?? null,
        event_type: params.eventType,
        touchpoint_id: params.touchpointId ?? null,
        campaign_id: params.campaignId ?? null,
        metadata: params.metadata ?? {},
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Failed to insert lifecycle_event:", error);
      return null;
    }

    // Mirror to PostHog (server-side tracking)
    try {
      await capturePostHogServerEvent(
        params.customerId || `anon_${params.restaurantId}`,
        `lifecycle_${params.eventType}`,
        {
          restaurant_id: params.restaurantId,
          touchpoint_id: params.touchpointId,
          campaign_id: params.campaignId,
          ...params.metadata,
        }
      );
    } catch {
      // Non-blocking PostHog mirror
    }

    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      customerId: data.customer_id,
      eventType: data.event_type as LifecycleEventType,
      touchpointId: data.touchpoint_id,
      campaignId: data.campaign_id,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error("recordLifecycleEvent error:", err);
    return null;
  }
}

/**
 * Fetches recent lifecycle events for a restaurant (live feed).
 */
export async function getRecentLifecycleEvents(
  restaurantId: string,
  limit = 40
): Promise<LifecycleEventRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lifecycle_events")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    eventType: row.event_type as LifecycleEventType,
    touchpointId: row.touchpoint_id,
    campaignId: row.campaign_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}
