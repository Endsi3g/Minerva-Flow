import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import {
  alertRules,
  campaigns,
  connections,
  inflows,
  kpis,
  outflows,
  programs,
  serviceDays,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRestaurant } from "@/lib/data/restaurants";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getAlerts } from "@/lib/data/alerts";
import { getConnections } from "@/lib/data/finance";
import { simpleTrendForecast } from "@/lib/engine/forecast";

/**
 * Builds a compact, grounded text snapshot of the restaurant's current
 * data — used as system-prompt context for both the AI recommendations
 * route and the chat assistant, so the model reasons over real numbers
 * instead of hallucinating them.
 */
export function buildDataSnapshot() {
  const alerts = computeAlerts({
    serviceDays,
    connections,
    alertRules,
    financialTransactions: [],
  });
  const baseRecommendations = computeRecommendations({ campaigns, programs, serviceDays, alerts });

  const recentDays = [...serviceDays]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map(
      (d) =>
        `- ${formatDate(d.date)} : ${formatCurrency(d.revenue)}, source principale ${d.mainSource}${
          d.anomaly ? `, anomalie: ${d.anomaly}` : ""
        }${d.notes ? ` — note: "${d.notes}"` : ""}`
    )
    .join("\n");

  const programLines = programs
    .map((p) => {
      const margin = p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : null;
      return `- ${p.name} (${p.type}, ${p.status}) : revenu ${formatCurrency(p.revenue)}, coût ${formatCurrency(p.cost)}${margin !== null ? `, marge ${margin}%` : ""}`;
    })
    .join("\n");

  const campaignLines = campaigns
    .map(
      (c) =>
        `- ${c.name} (${c.channel}, ${c.status}) : ${c.visites} visites, revenu estimé ${formatCurrency(c.estimatedRevenue)}, impact ${c.impact}`
    )
    .join("\n");

  const alertLines = alerts
    .map((a) => `- [${a.severity}] ${a.title} (${formatDate(a.date)}) — ${a.detail}`)
    .join("\n");

  const connectionLines = connections
    .map((c) => `- ${c.name} (${c.type}) : ${c.status}${c.detail ? ` — ${c.detail}` : ""}`)
    .join("\n");

  return `Tu es l'assistant de Minerva Flow, le cockpit de revenus d'un restaurant. Voici l'état actuel des données du restaurant "Vieux-Port" (Marseille) pour la période en cours :

KPIs :
- Revenu total : ${formatCurrency(kpis.totalRevenue)} (${kpis.totalRevenueDelta >= 0 ? "+" : ""}${kpis.totalRevenueDelta}% vs période précédente)
- Marge estimée : ${formatCurrency(kpis.estimatedMargin)} (${kpis.estimatedMarginDelta >= 0 ? "+" : ""}${kpis.estimatedMarginDelta}%)
- Journées de service sur la période : ${kpis.serviceDaysCount}
- Campagnes actives : ${kpis.activeCampaigns}

Entrées principales : ${inflows.map((l) => `${l.label} (${formatCurrency(l.amount)})`).join(", ")}
Sorties principales : ${outflows.map((l) => `${l.label} (${formatCurrency(l.amount)})`).join(", ")}

Journées de service récentes :
${recentDays}

Programmes de revenus :
${programLines}

Campagnes :
${campaignLines}

Alertes actives :
${alertLines || "Aucune alerte active."}

Connexions / intégrations :
${connectionLines}

Réponds toujours en français, de façon concise et opérationnelle. Base-toi uniquement sur les données fournies ci-dessus — si une information n'y figure pas, dis clairement que tu ne l'as pas plutôt que de l'inventer. Ne fais jamais d'affirmation causale forte (« la campagne X a causé Y ») quand seule une corrélation est visible dans les données ; utilise un langage prudent (« semble corrélé à », « pourrait expliquer »).`;
}

/**
 * Restaurant-scoped equivalent of buildDataSnapshot(), used by the AI chat
 * route (app/api/ai/chat/route.ts) — pulls from the real Supabase-backed
 * lib/data/*.ts modules instead of lib/mock-data.ts. The recommendations
 * route (/api/ai/recommendations) intentionally stays on buildDataSnapshot()
 * / mock data for now — out of scope for the chat redesign.
 */
export async function buildRestaurantDataSnapshot(restaurantId: string): Promise<string> {
  const [restaurant, days, restaurantPrograms, restaurantCampaigns, alerts, restaurantConnections] =
    await Promise.all([
      getRestaurant(restaurantId),
      getServiceDays(restaurantId),
      getPrograms(restaurantId),
      getCampaigns(restaurantId),
      getAlerts(restaurantId),
      getConnections(restaurantId),
    ]);

  const recentDays = days
    .slice(0, 8)
    .map(
      (d) =>
        `- ${formatDate(d.date)} : ${formatCurrency(d.revenue)}, source principale ${d.mainSource}${
          d.anomaly ? `, anomalie: ${d.anomaly}` : ""
        }${d.notes ? ` — note: "${d.notes}"` : ""}`
    )
    .join("\n");

  const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);

  const programLines = restaurantPrograms
    .map((p) => {
      const margin = p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : null;
      return `- ${p.name} (${p.type}, ${p.status}) : revenu ${formatCurrency(p.revenue)}, coût ${formatCurrency(p.cost)}${margin !== null ? `, marge ${margin}%` : ""}`;
    })
    .join("\n");

  const campaignLines = restaurantCampaigns
    .map(
      (c) =>
        `- ${c.name} (${c.channel}, ${c.status}) : ${c.visites} visites, revenu estimé ${formatCurrency(c.estimatedRevenue)}, impact ${c.impact}`
    )
    .join("\n");

  const alertLines = alerts
    .map((a) => `- [${a.severity}] ${a.title} (${formatDate(a.date)}) — ${a.detail}`)
    .join("\n");

  const connectionLines = restaurantConnections
    .map((c) => `- ${c.name} (${c.type}) : ${c.status}${c.detail ? ` — ${c.detail}` : ""}`)
    .join("\n");

  const revenueForecast = simpleTrendForecast(
    days.map((d) => ({ date: d.date, value: d.revenue })),
    14
  );
  const forecastLines = revenueForecast
    .map((p) => `- ${formatDate(p.date)} : ${formatCurrency(p.value)} (estimation)`)
    .join("\n");

  return `Tu es l'assistant de Minerva Flow, le cockpit de revenus d'un restaurant. Voici l'état actuel des données du restaurant "${restaurant?.name ?? "—"}"${restaurant?.city ? ` (${restaurant.city})` : ""} :

KPIs :
- Revenu total (journées enregistrées) : ${formatCurrency(totalRevenue)}
- Journées de service enregistrées : ${days.length}
- Campagnes actives : ${restaurantCampaigns.filter((c) => c.status === "active").length}

Journées de service récentes :
${recentDays || "Aucune journée enregistrée."}

Programmes de revenus :
${programLines || "Aucun programme."}

Campagnes :
${campaignLines || "Aucune campagne."}

Alertes actives :
${alertLines || "Aucune alerte active."}

Connexions / intégrations :
${connectionLines || "Aucune connexion configurée."}

Prévision de revenu (régression linéaire simple sur les journées enregistrées, 14 prochains jours — une estimation grossière, pas un vrai modèle prédictif) :
${forecastLines || "Pas assez de journées enregistrées pour une prévision."}

Réponds toujours en français, de façon concise et opérationnelle. Base-toi uniquement sur les données fournies ci-dessus — si une information n'y figure pas, dis clairement que tu ne l'as pas plutôt que de l'inventer. Ne fais jamais d'affirmation causale forte (« la campagne X a causé Y ») quand seule une corrélation est visible dans les données ; utilise un langage prudent (« semble corrélé à », « pourrait expliquer »). Si tu inclus une prédiction dans un artefact, utilise exactement les valeurs de la section "Prévision de revenu" ci-dessus plutôt que d'en inventer de nouvelles.`;
}

export function ruleBasedFallback() {
  const alerts = computeAlerts({
    serviceDays,
    connections,
    alertRules,
    financialTransactions: [],
  });
  return computeRecommendations({ campaigns, programs, serviceDays, alerts });
}
