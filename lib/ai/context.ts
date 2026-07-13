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

export function ruleBasedFallback() {
  const alerts = computeAlerts({
    serviceDays,
    connections,
    alertRules,
    financialTransactions: [],
  });
  return computeRecommendations({ campaigns, programs, serviceDays, alerts });
}
