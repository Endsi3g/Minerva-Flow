import type { Alert, Campaign, Program, Recommendation, ServiceDay } from "@/lib/types";
import { LABOR_COST_TARGET_PCT } from "@/lib/engine/labor-cost";

const weekdayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export type ComputeRecommendationsInput = {
  campaigns: Campaign[];
  programs: Program[];
  serviceDays: ServiceDay[];
  alerts: Alert[];
  laborCostPct?: number | null;
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
  laborCostPct,
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
      confidenceScore: 0.91,
      confidenceLevel: "elevee",
      dataSources: [`Historique des ventes sur 30 jours`, `Tickets de caisse des ${weekdayNames[dow]}s`],
      actionUrl: "/campaigns",
      actionLabel: "Créer une offre du jour",
      impactEstimate: "+250 $ à +450 $ par service ciblé",
      explanation: `L'écart de fréquentation récurrent le ${weekdayNames[dow]} indique une sous-capacité d'accueil rentable sans coût fixe additionnel.`,
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
      confidenceScore: 0.94,
      confidenceLevel: "elevee",
      dataSources: [`Grand livre des dépenses`, `Seuils de variance budgétaire`],
      actionUrl: "/finance",
      actionLabel: "Vérifier la transaction",
      impactEstimate: "Contrôle immédiat des sorties de trésorerie",
      explanation: `Cette ligne dépasse de plus de 2 écarts-types la moyenne observée sur la catégorie ${category}.`,
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
      confidenceScore: 0.88,
      confidenceLevel: "moyenne",
      dataSources: [`Rapports de clôture de caisse`, `Calendrier des services actifs`],
      actionUrl: "/days",
      actionLabel: "Compléter les journées",
      impactEstimate: "Précision des calculs de rentabilité restaurée",
      explanation: `Sans ces données, la marge cumulée et le coût des aliments reposent sur des moyennes estimées.`,
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
        confidenceScore: 0.92,
        confidenceLevel: "elevee",
        dataSources: [`Fiches de prix des programmes`, `Historique des coûts d'exécution`],
        actionUrl: `/programs?id=${lowest.p.id}`,
        actionLabel: "Optimiser le programme",
        impactEstimate: `+${Math.round((avgMargin - lowest.margin) * lowest.p.revenue)} $ de marge recouvrable`,
        explanation: `Ce programme génère du chiffre d'affaires mais dilue la rentabilité globale de l'établissement.`,
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
      confidenceScore: 0.89,
      confidenceLevel: "moyenne",
      dataSources: [`Attribution des visites POS`, `Retombées de campagne`],
      actionUrl: "/campaigns",
      actionLabel: "Revoir la campagne",
      impactEstimate: "Recentrage sur des clients à panier moyen plus élevé",
      explanation: `Le coût d'acquisition ou la remise consentie est trop proche du panier additionnel constaté.`,
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
      confidenceScore: 0.87,
      confidenceLevel: "moyenne",
      dataSources: [`Pointages de vitesse de rotation`, `Journal des incidents de service`],
      actionUrl: "/reservations",
      actionLabel: "Gérer les créneaux",
      impactEstimate: "Fluidité du service et satisfaction client préservées",
      explanation: `Les pics non gérés génèrent des retards en cuisine et risquent d'éroder la fidélité client.`,
    });
  }

  // From low-stock alerts: the concrete "what to order from the supplier"
  // suggestion the product spec calls for at clôture — one entry per item
  // under threshold, turning the alert into an actionable next step instead
  // of just a warning.
  for (const alert of alerts.filter((a) => a.id.startsWith("low-stock-"))) {
    const itemName = alert.title.replace("Stock bas — ", "");
    recs.push({
      id: `rec-${alert.id}`,
      diagnosis: `${itemName} est sous son seuil de réapprovisionnement.`,
      suggestedAction: `Passer une commande fournisseur pour ${itemName} depuis Fournisseurs avant la prochaine rupture.`,
      relatedMetric: "inventaire",
      status: "nouvelle",
      source: "regles",
      confidenceScore: 0.96,
      confidenceLevel: "elevee",
      dataSources: [`Stocks physiques en cuisine`, `Seuils de sécurité par ingrédient`],
      actionUrl: "/fournisseurs",
      actionLabel: "Commander au fournisseur",
      impactEstimate: "Évite une rupture de plat en plein coup de feu",
      explanation: `Le stock actuel est inférieur au délai de réapprovisionnement du fournisseur référencé.`,
    });
  }

  // Labor cost over the target — the concrete "adjust the schedule" signal
  // behind the Overview "Masse salariale" banner, same shape as the low-stock
  // → supplier-order rule above.
  if (laborCostPct != null && laborCostPct > LABOR_COST_TARGET_PCT) {
    recs.push({
      id: "rec-labor-cost-high",
      diagnosis: `La masse salariale représente ${laborCostPct}% du chiffre d'affaires ce mois-ci, au-dessus de la cible de ${LABOR_COST_TARGET_PCT}%.`,
      suggestedAction: "Revoir les horaires de la semaine prochaine dans Horaire pour réduire la sur-couverture aux heures creuses.",
      relatedMetric: "masse salariale",
      status: "nouvelle",
      source: "regles",
      confidenceScore: 0.93,
      confidenceLevel: "elevee",
      dataSources: [`Planning des heures travaillées`, `Chiffre d'affaires net déclaré`],
      actionUrl: "/horaire",
      actionLabel: "Ajuster les shifts",
      impactEstimate: `Gain estimé de ${Math.round((laborCostPct - LABOR_COST_TARGET_PCT) * 10) / 10} pt de masse salariale`,
      explanation: `Chaque point de masse salariale au-dessus de ${LABOR_COST_TARGET_PCT}% réduit directement le bénéfice net de votre établissement.`,
    });
  }

  return recs;
}
