import type { Alert, Campaign, Program, Recommendation, ServiceDay } from "@/lib/types";

const weekdayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export type ComputeRecommendationsInput = {
  campaigns: Campaign[];
  programs: Program[];
  serviceDays: ServiceDay[];
  alerts: Alert[];
};

/**
 * Rule-based recommendation engine — the always-available fallback.
 * Every recommendation here is derived from a concrete, visible signal
 * (an alert, a margin figure, a campaign ratio) so it never overstates
 * confidence. This is what powers the Recommendations panel until an
 * AI Gateway key is configured (see lib/ai/recommendations.ts for the
 * AI-enhanced version, which starts from these same signals). `alerts`
 * is computed by lib/engine/alerts.ts and passed in rather than
 * recomputed here.
 */
export function computeRecommendations({
  campaigns,
  programs,
  serviceDays,
  alerts,
}: ComputeRecommendationsInput): Recommendation[] {
  const recs: Recommendation[] = [];

  // From revenue-drop alerts: suggest testing an activation on that weekday.
  const dropAlert = alerts.find((a) => a.id.startsWith("revenue-drop"));
  if (dropAlert) {
    const dow = new Date(dropAlert.date + "T00:00:00").getDay();
    recs.push({
      id: "rec-weak-weekday",
      diagnosis: `Le ${weekdayNames[dow]} ressort régulièrement sous la moyenne des autres jours de la semaine.`,
      suggestedAction: `Tester une activation ciblée (promo, événement) le ${weekdayNames[dow]} pour combler ce creux.`,
      relatedMetric: "revenu",
      status: "nouvelle",
      source: "regles",
    });
  }

  // From expense-spike alerts: suggest investigating that category.
  const spikeAlert = alerts.find((a) => a.id.startsWith("expense-spike"));
  if (spikeAlert) {
    const category = spikeAlert.title.replace("Pic de dépense — ", "");
    recs.push({
      id: "rec-expense-spike",
      diagnosis: `Une dépense sort nettement de la moyenne habituelle sur la catégorie "${category}".`,
      suggestedAction: `Vérifier cette transaction dans Finance → Transactions et confirmer qu'elle est justifiée.`,
      relatedMetric: "dépenses",
      status: "nouvelle",
      source: "regles",
    });
  }

  // From missing-day-input alerts: suggest catching up.
  if (alerts.some((a) => a.id === "missing-day-input")) {
    recs.push({
      id: "rec-missing-days",
      diagnosis: "Plusieurs journées récentes n'ont pas encore été saisies par l'équipe.",
      suggestedAction: "Relancer le staff pour compléter les notes de service sur Days — surtout les jours à forte variance.",
      relatedMetric: "journées de service",
      status: "nouvelle",
      source: "regles",
    });
  }

  // Program margin outlier — lowest-margin active program worth reviewing.
  const activePrograms = programs.filter((p) => p.status === "actif" && p.revenue > 0);
  if (activePrograms.length > 1) {
    const withMargin = activePrograms.map((p) => ({
      p,
      margin: (p.revenue - p.cost) / p.revenue,
    }));
    const lowest = withMargin.reduce((a, b) => (b.margin < a.margin ? b : a));
    const avgMargin =
      withMargin.reduce((s, x) => s + x.margin, 0) / withMargin.length;
    if (lowest.margin < avgMargin - 0.08) {
      recs.push({
        id: `rec-margin-${lowest.p.id}`,
        diagnosis: `"${lowest.p.name}" tourne à ${Math.round(lowest.margin * 100)}% de marge, sous la moyenne de vos programmes actifs (${Math.round(avgMargin * 100)}%).`,
        suggestedAction: "Revoir le coût matière ou le prix de ce programme dans Programs.",
        relatedMetric: "marge",
        relatedProgramId: lowest.p.id,
        status: "nouvelle",
        source: "regles",
      });
    }
  }

  // Campaign with weak revenue-per-visit — low measured return.
  const activeCampaigns = campaigns.filter((c) => c.status === "active" && c.visites > 0);
  const weakCampaign = activeCampaigns.find((c) => c.estimatedRevenue / c.visites < 1.5);
  if (weakCampaign) {
    recs.push({
      id: `rec-campaign-${weakCampaign.id}`,
      diagnosis: `"${weakCampaign.name}" génère beaucoup de visites mais peu de revenu mesurable par visite.`,
      suggestedAction: "Ajuster le ciblage ou l'offre de cette campagne, ou la remplacer par un format plus direct.",
      relatedMetric: "campagnes",
      relatedCampaignId: weakCampaign.id,
      status: "nouvelle",
      source: "regles",
    });
  }

  // Rush without a follow-up promo — capacity signal.
  const rushDays = serviceDays.filter((d) => d.anomaly === "rush");
  if (rushDays.length >= 2) {
    recs.push({
      id: "rec-rush-capacity",
      diagnosis: `${rushDays.length} journées récentes ont été marquées "rush" — la demande dépasse parfois la capacité de service.`,
      suggestedAction: "Envisager un service supplémentaire ou une réservation obligatoire sur ces créneaux.",
      relatedMetric: "journées de service",
      status: "nouvelle",
      source: "regles",
    });
  }

  return recs;
}
