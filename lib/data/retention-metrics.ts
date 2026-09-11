import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { LifecycleEventType, LIFECYCLE_EVENT_CONFIG } from "@/lib/data/lifecycle-events";

export type RetentionTimeRange = "7d" | "30d" | "90d" | "all";

export type RetentionKpiStatus = "excellent" | "good" | "warning" | "neutral";

export type RetentionKpi = {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit: "%" | "$" | "visites" | "";
  target: string;
  status: RetentionKpiStatus;
  benchmarkNote: string;
  description: string;
};

export type FunnelStep = {
  id: string;
  label: string;
  count: number;
  conversionFromPrev: number | null; // % (null for step 0)
  dropoffFromPrev: number | null; // %
  conversionFromTotal: number; // % from step 0
  color: string;
  icon: string;
};

export type LifecycleEventItem = {
  id: string;
  eventType: LifecycleEventType;
  label: string;
  stage: string;
  icon: string;
  customerName: string | null;
  customerId: string | null;
  createdAt: string;
  formattedDate: string;
  metadata: Record<string, unknown>;
};

export type RetentionFunnelDashboardData = {
  timeRange: RetentionTimeRange;
  kpis: {
    scanToSignupRate: RetentionKpi;
    activationRate: RetentionKpi;
    secondVisitRate: RetentionKpi;
    thirtyDayReturnRate: RetentionKpi;
    averageVisitFrequency: RetentionKpi;
    rewardRedemptionRate: RetentionKpi;
    averageMemberBasket: RetentionKpi;
    campaignAttributedRevenue: RetentionKpi;
    costPerReactivatedCustomer: RetentionKpi;
    unsubscribeRate: RetentionKpi;
  };
  funnelSteps: FunnelStep[];
  rawCounts: {
    scans: number;
    formStarts: number;
    registrations: number;
    firstVisits: number;
    secondVisits: number;
    rewardsUnlocked: number;
    rewardsRedeemed: number;
    campaignsSent: number;
    messagesDelivered: number;
    unsubscribes: number;
    campaignVisits: number;
    campaignRevenue: number;
    referralsSent: number;
    referralsConverted: number;
    totalMembers: number;
  };
  recentEvents: LifecycleEventItem[];
};

function getRangeStartDate(range: RetentionTimeRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

/**
 * Computes all 10 retention & lifecycle KPIs for a restaurant,
 * joining real-time lifecycle_events with customer records and campaign attributions.
 */
export async function getRetentionFunnelMetrics(
  restaurantId: string,
  timeRange: RetentionTimeRange = "30d"
): Promise<RetentionFunnelDashboardData> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const startDateIso = getRangeStartDate(timeRange);

  // 1. Fetch lifecycle events in range
  let eventsQuery = admin
    .from("lifecycle_events")
    .select("id, customer_id, event_type, metadata, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (startDateIso) {
    eventsQuery = eventsQuery.gte("created_at", startDateIso);
  }

  const { data: eventRows, error: eventsError } = await eventsQuery;
  if (eventsError) {
    console.error("Failed to fetch lifecycle_events for metrics:", eventsError.message);
  }

  const events = eventRows ?? [];

  // Count occurrences by event type
  const eventCounts: Record<LifecycleEventType, number> = {
    qr_code_displayed: 0,
    qr_code_scanned: 0,
    form_started: 0,
    registration_completed: 0,
    sms_consent_given: 0,
    first_visit_recognized: 0,
    second_visit_recognized: 0,
    reward_unlocked: 0,
    reward_redeemed: 0,
    campaign_sent: 0,
    message_delivered: 0,
    unsubscribed: 0,
    campaign_visit_generated: 0,
    referral_sent: 0,
    referral_converted: 0,
  };

  let campaignRevenue = 0;
  const reactivatedCustomerIds = new Set<string>();

  for (const ev of events) {
    const type = ev.event_type as LifecycleEventType;
    if (eventCounts[type] !== undefined) {
      eventCounts[type]++;
    }
    if (type === "campaign_visit_generated") {
      const meta = (ev.metadata ?? {}) as Record<string, unknown>;
      const spent = typeof meta.amountSpent === "number" ? meta.amountSpent : 0;
      campaignRevenue += spent;
      if (ev.customer_id) {
        reactivatedCustomerIds.add(ev.customer_id);
      }
    }
  }

  // 2. Fetch customer population data (for accurate cohort & visit frequency)
  const { data: customersData } = await admin
    .from("customers")
    .select("id, name, visit_count, total_spent, last_visit_at, created_at")
    .eq("restaurant_id", restaurantId);

  const customers = customersData ?? [];
  const totalMembers = customers.length;
  const customersWithOnePlusVisits = customers.filter((c) => c.visit_count >= 1);
  const customersWithTwoPlusVisits = customers.filter((c) => c.visit_count >= 2);

  const totalVisits = customers.reduce((sum, c) => sum + (c.visit_count || 0), 0);
  const totalCustomerSpend = customers.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);

  // 30-day return rate: members whose last visit is within 30 days and have 2+ visits
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const returnedWithin30Days = customers.filter(
    (c) => c.visit_count >= 2 && c.last_visit_at && c.last_visit_at >= thirtyDaysAgoIso
  ).length;

  // 3. Fallbacks and blended metrics
  const scansCount = Math.max(eventCounts.qr_code_scanned, eventCounts.registration_completed, 1);
  const formStartsCount = Math.max(eventCounts.form_started, eventCounts.registration_completed);
  const registrationCount = Math.max(eventCounts.registration_completed, totalMembers);
  const firstVisitsCount = Math.max(eventCounts.first_visit_recognized, customersWithOnePlusVisits.length);
  const secondVisitsCount = Math.max(eventCounts.second_visit_recognized, customersWithTwoPlusVisits.length);

  // KPI 1: Taux de scan vers inscription (inscriptions / scans)
  const scanToSignupVal = scansCount > 0 ? Math.min(100, Math.round((registrationCount / scansCount) * 1000) / 10) : 0;
  const scanToSignupKpi: RetentionKpi = {
    id: "scan_to_signup",
    label: "Taux de scan vers inscription",
    value: scanToSignupVal,
    formattedValue: `${scanToSignupVal.toFixed(1)} %`,
    unit: "%",
    target: "Cible : ≥ 30 %",
    status: scanToSignupVal >= 30 ? "excellent" : scanToSignupVal >= 20 ? "good" : "warning",
    benchmarkNote: "Moyenne secteur : 22 % — Excellent au-delà de 35 %.",
    description: "Pourcentage des visiteurs ayant scanné un QR code qui finalisent leur inscription au programme.",
  };

  // KPI 2: Taux d'activation (clients avec ≥ 1 visite / total inscrits)
  const activationVal =
    totalMembers > 0
      ? Math.min(100, Math.round((customersWithOnePlusVisits.length / totalMembers) * 1000) / 10)
      : 0;
  const activationKpi: RetentionKpi = {
    id: "activation_rate",
    label: "Taux d'activation",
    value: activationVal,
    formattedValue: `${activationVal.toFixed(1)} %`,
    unit: "%",
    target: "Cible : ≥ 70 %",
    status: activationVal >= 70 ? "excellent" : activationVal >= 50 ? "good" : "warning",
    benchmarkNote: "Standard Minerva Flow : 75 % dès le palier débutant (Câlin Café).",
    description: "Proportion des inscrits ayant validé au moins une première visite au comptoir.",
  };

  // KPI 3: Taux de deuxième visite (clients avec ≥ 2 visites / clients avec ≥ 1 visite)
  const secondVisitVal =
    customersWithOnePlusVisits.length > 0
      ? Math.min(
          100,
          Math.round((customersWithTwoPlusVisits.length / customersWithOnePlusVisits.length) * 1000) / 10
        )
      : 0;
  const secondVisitKpi: RetentionKpi = {
    id: "second_visit_rate",
    label: "Taux de deuxième visite",
    value: secondVisitVal,
    formattedValue: `${secondVisitVal.toFixed(1)} %`,
    unit: "%",
    target: "Cible : 75 % – 100 %",
    status: secondVisitVal >= 75 ? "excellent" : secondVisitVal >= 50 ? "good" : "warning",
    benchmarkNote: "75 % pour Câlin Café (18j), 100 % pour Burger Nomade & Café Lucide (30j).",
    description: "Le KPI d'or de la fidélisation : un client revenant une 2e fois a 4x plus de chances de devenir un régulier.",
  };

  // KPI 4: Taux de retour à 30 jours
  const thirtyDayReturnVal =
    customersWithTwoPlusVisits.length > 0
      ? Math.min(100, Math.round((returnedWithin30Days / customersWithTwoPlusVisits.length) * 1000) / 10)
      : 0;
  const thirtyDayReturnKpi: RetentionKpi = {
    id: "thirty_day_return_rate",
    label: "Taux de retour à 30 jours",
    value: thirtyDayReturnVal,
    formattedValue: `${thirtyDayReturnVal.toFixed(1)} %`,
    unit: "%",
    target: "Cible : ≥ 70 %",
    status: thirtyDayReturnVal >= 70 ? "excellent" : thirtyDayReturnVal >= 45 ? "good" : "warning",
    benchmarkNote: "Seuil de fidélité active sans risque d'attrition imminente.",
    description: "Pourcentage des membres actifs ayant renouvelé une visite au cours des 30 derniers jours.",
  };

  // KPI 5: Fréquence moyenne des visites
  const activeMembersCount = customersWithOnePlusVisits.length;
  const avgFrequencyVal =
    activeMembersCount > 0 ? Math.round((totalVisits / activeMembersCount) * 10) / 10 : 0;
  const avgFrequencyKpi: RetentionKpi = {
    id: "avg_visit_frequency",
    label: "Fréquence moyenne des visites",
    value: avgFrequencyVal,
    formattedValue: `${avgFrequencyVal.toFixed(1)} visites`,
    unit: "visites",
    target: "Cible : ×3,6 (2,5 à 9,1)",
    status: avgFrequencyVal >= 4.4 ? "excellent" : avgFrequencyVal >= 2.5 ? "good" : "neutral",
    benchmarkNote: "Évolution audité : de 2,5 (Câlin Café) à 4,4 (Burger Nomade) jusqu'à 9,1 (Trèfle Doré).",
    description: "Nombre moyen de passages effectués par chaque client fidélisé dans votre établissement.",
  };

  // KPI 6: Taux d'échange des récompenses
  const rewardsUnlockedCount = Math.max(eventCounts.reward_unlocked, eventCounts.reward_redeemed, 1);
  const rewardsRedeemedCount = eventCounts.reward_redeemed;
  const rewardRedemptionVal =
    rewardsUnlockedCount > 0
      ? Math.min(100, Math.round((rewardsRedeemedCount / rewardsUnlockedCount) * 1000) / 10)
      : 0;
  const rewardRedemptionKpi: RetentionKpi = {
    id: "reward_redemption_rate",
    label: "Taux d'échange des récompenses",
    value: rewardRedemptionVal,
    formattedValue: `${rewardRedemptionVal.toFixed(1)} %`,
    unit: "%",
    target: "Cible : 35 % – 60 %",
    status:
      rewardRedemptionVal >= 35 && rewardRedemptionVal <= 70
        ? "excellent"
        : rewardRedemptionVal > 0
          ? "good"
          : "neutral",
    benchmarkNote: "Un taux sain prouve l'attractivité des paliers sans grever la marge.",
    description: "Ratio des récompenses débloquées qui ont été effectivement réclamées au comptoir.",
  };

  // KPI 7: Panier moyen des membres
  const avgBasketVal = totalVisits > 0 ? Math.round((totalCustomerSpend / totalVisits) * 100) / 100 : 0;
  const avgBasketKpi: RetentionKpi = {
    id: "avg_member_basket",
    label: "Panier moyen des membres",
    value: avgBasketVal,
    formattedValue: formatCurrency(avgBasketVal),
    unit: "$",
    target: "Cible : +15 % vs non-membres",
    status: avgBasketVal > 0 ? "excellent" : "neutral",
    benchmarkNote: "Audits : 19,98 $ (Café quartier) · 86,84 $ (Burger) · 206,64 $ (Bistro).",
    description: "Dépense moyenne TTC enregistrée à chaque visite pour un client membre du programme.",
  };

  // KPI 8: Revenus attribués aux campagnes (visites dans les 7 jours)
  const campaignAttributedRevenueVal = Math.round(campaignRevenue * 100) / 100;
  const campaignRevenueKpi: RetentionKpi = {
    id: "campaign_attributed_revenue",
    label: "Revenus attribués aux campagnes",
    value: campaignAttributedRevenueVal,
    formattedValue: formatCurrency(campaignAttributedRevenueVal),
    unit: "$",
    target: "Fenêtre : 7 jours post-envoi",
    status: campaignAttributedRevenueVal > 0 ? "excellent" : "neutral",
    benchmarkNote: "Attribution directe : passage en caisse réalisé dans les 7 jours suivant une relance.",
    description: "Chiffre d'affaires réel généré par les clients ayant visité suite à un email ou SMS promotionnel.",
  };

  // KPI 9: Coût par client réactivé
  const reactivatedCount = Math.max(reactivatedCustomerIds.size, eventCounts.campaign_visit_generated);
  const estimatedCost = eventCounts.campaign_sent * 0.035; // Est. 0.035 $ par envoi combiné
  const costPerReactivatedVal =
    reactivatedCount > 0 ? Math.round((estimatedCost / reactivatedCount) * 100) / 100 : 0;
  const costPerReactivatedKpi: RetentionKpi = {
    id: "cost_per_reactivated",
    label: "Coût par client réactivé",
    value: costPerReactivatedVal,
    formattedValue: costPerReactivatedVal > 0 ? formatCurrency(costPerReactivatedVal) : "0,00 $",
    unit: "$",
    target: "Cible : < 3,00 $",
    status:
      costPerReactivatedVal > 0 && costPerReactivatedVal <= 3
        ? "excellent"
        : costPerReactivatedVal > 3
          ? "warning"
          : "neutral",
    benchmarkNote: "Comparé à 25 $ - 40 $ pour acquérir un client par de la publicité traditionnelle.",
    description: "Coût technique des envois rapporté au nombre de clients réengagés revenus consommer.",
  };

  // KPI 10: Taux de désinscription (désinscriptions / messages livrés)
  const deliveredCount = Math.max(eventCounts.message_delivered, eventCounts.campaign_sent, 1);
  const unsubscribesCount = eventCounts.unsubscribed;
  const unsubscribeRateVal =
    deliveredCount > 0 ? Math.min(100, Math.round((unsubscribesCount / deliveredCount) * 1000) / 10) : 0;
  const unsubscribeRateKpi: RetentionKpi = {
    id: "unsubscribe_rate",
    label: "Taux de désinscription",
    value: unsubscribeRateVal,
    formattedValue: `${unsubscribeRateVal.toFixed(1)} %`,
    unit: "%",
    target: "Seuil d'alerte : < 2,0 %",
    status: unsubscribeRateVal < 1.0 ? "excellent" : unsubscribeRateVal <= 2.0 ? "good" : "warning",
    benchmarkNote: "Conformité LCAP / CASL stricte. Alerte déclenchée si > 2 %.",
    description: "Proportion des destinataires ayant choisi de se désabonner suite à une communication.",
  };

  // 4. Construct the 5-Step Funnel
  const funnelSteps: FunnelStep[] = [
    {
      id: "scan",
      label: "1. QR Code scanné",
      count: scansCount,
      conversionFromPrev: null,
      dropoffFromPrev: null,
      conversionFromTotal: 100,
      color: "#167F5B",
      icon: "QrCode",
    },
    {
      id: "form_started",
      label: "2. Formulaire entamé",
      count: formStartsCount,
      conversionFromPrev: scansCount > 0 ? Math.min(100, Math.round((formStartsCount / scansCount) * 100)) : 0,
      dropoffFromPrev:
        scansCount > 0 ? Math.max(0, 100 - Math.round((formStartsCount / scansCount) * 100)) : 0,
      conversionFromTotal: scansCount > 0 ? Math.min(100, Math.round((formStartsCount / scansCount) * 100)) : 0,
      color: "#0E5A40",
      icon: "Edit3",
    },
    {
      id: "registered",
      label: "3. Inscription complétée",
      count: registrationCount,
      conversionFromPrev:
        formStartsCount > 0 ? Math.min(100, Math.round((registrationCount / formStartsCount) * 100)) : 0,
      dropoffFromPrev:
        formStartsCount > 0 ? Math.max(0, 100 - Math.round((registrationCount / formStartsCount) * 100)) : 0,
      conversionFromTotal: scansCount > 0 ? Math.min(100, Math.round((registrationCount / scansCount) * 100)) : 0,
      color: "#2C7A7B",
      icon: "UserCheck",
    },
    {
      id: "first_visit",
      label: "4. Première visite",
      count: firstVisitsCount,
      conversionFromPrev:
        registrationCount > 0 ? Math.min(100, Math.round((firstVisitsCount / registrationCount) * 100)) : 0,
      dropoffFromPrev:
        registrationCount > 0 ? Math.max(0, 100 - Math.round((firstVisitsCount / registrationCount) * 100)) : 0,
      conversionFromTotal: scansCount > 0 ? Math.min(100, Math.round((firstVisitsCount / scansCount) * 100)) : 0,
      color: "#AB7D1F",
      icon: "ShoppingBag",
    },
    {
      id: "second_visit",
      label: "5. Deuxième visite (Rétention)",
      count: secondVisitsCount,
      conversionFromPrev:
        firstVisitsCount > 0 ? Math.min(100, Math.round((secondVisitsCount / firstVisitsCount) * 100)) : 0,
      dropoffFromPrev:
        firstVisitsCount > 0 ? Math.max(0, 100 - Math.round((secondVisitsCount / firstVisitsCount) * 100)) : 0,
      conversionFromTotal: scansCount > 0 ? Math.min(100, Math.round((secondVisitsCount / scansCount) * 100)) : 0,
      color: "#167F5B",
      icon: "Repeat",
    },
  ];

  // 5. Recent events with customer name lookup
  const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));
  const recentEvents: LifecycleEventItem[] = events.slice(0, 30).map((ev) => {
    const config = LIFECYCLE_EVENT_CONFIG[ev.event_type as LifecycleEventType] ?? {
      label: ev.event_type,
      stage: "autre",
      icon: "Activity",
    };
    const cName = ev.customer_id ? customerNameMap.get(ev.customer_id) ?? null : null;
    return {
      id: ev.id,
      eventType: ev.event_type as LifecycleEventType,
      label: config.label,
      stage: config.stage,
      icon: config.icon,
      customerName: cName,
      customerId: ev.customer_id,
      createdAt: ev.created_at,
      formattedDate: new Intl.DateTimeFormat("fr-CA", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Montreal",
      }).format(new Date(ev.created_at)),
      metadata: (ev.metadata ?? {}) as Record<string, unknown>,
    };
  });

  return {
    timeRange,
    kpis: {
      scanToSignupRate: scanToSignupKpi,
      activationRate: activationKpi,
      secondVisitRate: secondVisitKpi,
      thirtyDayReturnRate: thirtyDayReturnKpi,
      averageVisitFrequency: avgFrequencyKpi,
      rewardRedemptionRate: rewardRedemptionKpi,
      averageMemberBasket: avgBasketKpi,
      campaignAttributedRevenue: campaignRevenueKpi,
      costPerReactivatedCustomer: costPerReactivatedKpi,
      unsubscribeRate: unsubscribeRateKpi,
    },
    funnelSteps,
    rawCounts: {
      scans: scansCount,
      formStarts: formStartsCount,
      registrations: registrationCount,
      firstVisits: firstVisitsCount,
      secondVisits: secondVisitsCount,
      rewardsUnlocked: rewardsUnlockedCount,
      rewardsRedeemed: rewardsRedeemedCount,
      campaignsSent: eventCounts.campaign_sent,
      messagesDelivered: deliveredCount,
      unsubscribes: unsubscribesCount,
      campaignVisits: eventCounts.campaign_visit_generated,
      campaignRevenue: campaignRevenue,
      referralsSent: eventCounts.referral_sent,
      referralsConverted: eventCounts.referral_converted,
      totalMembers,
    },
    recentEvents,
  };
}
