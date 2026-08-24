import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import { computeLaborCostPct, sumLaborCost } from "@/lib/engine/labor-cost";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRestaurant } from "@/lib/data/restaurants";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getAlerts, getAlertRules } from "@/lib/data/alerts";
import { getConnections, getFinancialTransactions } from "@/lib/data/finance";
import { getMenuItems } from "@/lib/data/menu";
import { getCustomers } from "@/lib/data/customers";
import { classifyMenuItems, getMarginDriftItems, quadrantLabel, MARGIN_DRIFT_FOOD_COST_PCT } from "@/lib/menu-engineering";
import { getInactiveCustomers } from "@/lib/engine/retention";
import { simpleTrendForecast } from "@/lib/engine/forecast";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS as CONTEXT_WINDOW_DAYS } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

/**
 * Restaurant-scoped snapshot used as system-prompt context for both the AI
 * chat route and the recommendations route, pulling from the real
 * Supabase-backed lib/data/*.ts modules — no mock data.
 */
export async function buildRestaurantDataSnapshot(restaurantId: string): Promise<string> {
  const [restaurant, days, restaurantPrograms, restaurantCampaigns, alerts, restaurantConnections, menuItems, customers] =
    await Promise.all([
      getRestaurant(restaurantId),
      getServiceDays(restaurantId, { from: isoDaysAgo(CONTEXT_WINDOW_DAYS) }),
      getPrograms(restaurantId),
      getCampaigns(restaurantId),
      getAlerts(restaurantId),
      getConnections(restaurantId),
      getMenuItems(restaurantId),
      getCustomers(restaurantId),
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

  const classifiedMenu = classifyMenuItems(menuItems);
  const marginDriftItems = getMarginDriftItems(classifiedMenu);
  const menuLines = classifiedMenu
    .filter((i) => i.active)
    .map(
      (i) =>
        `- ${i.name} (${quadrantLabel[i.quadrant]}) : prix ${formatCurrency(i.price)}, coût matière ${formatCurrency(i.foodCost)}${
          i.foodCostPct !== null ? ` (${Math.round(i.foodCostPct * 100)}% du prix)` : ""
        }, ${i.unitsSold} vendus`
    )
    .join("\n");
  const marginDriftLines = marginDriftItems
    .map((i) => `- ${i.name} : coût matière à ${Math.round((i.foodCostPct ?? 0) * 100)}% du prix, au-dessus du seuil de ${Math.round(MARGIN_DRIFT_FOOD_COST_PCT * 100)}%`)
    .join("\n");

  const inactivityThresholdDays = restaurant?.retentionInactivityDays ?? 21;
  const inactiveCustomersAll = getInactiveCustomers(customers, inactivityThresholdDays);
  const inactiveCustomers = [...inactiveCustomersAll].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const customerLines = customers.length
    ? `- Clients fidélité enregistrés : ${customers.length}\n- Clients inactifs depuis ${inactivityThresholdDays}+ jours : ${inactiveCustomersAll.length}` +
      (inactiveCustomers.length
        ? `\nClients réguliers à relancer en priorité (forte dépense cumulée, inactifs) :\n${inactiveCustomers
            .map((c) => `  - ${c.name} : ${formatCurrency(c.totalSpent)} dépensés, dernière visite ${c.lastVisitAt ? formatDate(c.lastVisitAt) : "inconnue"}`)
            .join("\n")}`
        : "")
    : "Aucun client enregistré dans le programme de fidélité.";

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

  return `Tu es l'assistant de Flow par Minerva, le cockpit de revenus d'un restaurant. Voici l'état actuel des données du restaurant "${restaurant?.name ?? "—"}"${restaurant?.city ? ` (${restaurant.city})` : ""} :

KPIs (13 derniers mois) :
- Revenu sur la période : ${formatCurrency(totalRevenue)}
- Journées de service enregistrées sur la période : ${days.length}
- Campagnes actives : ${restaurantCampaigns.filter((c) => c.status === "active").length}

Journées de service récentes :
${recentDays || "Aucune journée enregistrée."}

Programmes de revenus :
${programLines || "Aucun programme."}

Rentabilité du menu (food cost & marge par plat, classification étoile/cheval de bataille/énigme/poids mort) :
${menuLines || "Aucun plat actif au menu."}
${marginDriftLines ? `\nDérive de marge détectée (coût matière anormalement élevé) :\n${marginDriftLines}` : ""}

Clients & fidélité :
${customerLines}

Campagnes :
${campaignLines || "Aucune campagne."}

Alertes actives :
${alertLines || "Aucune alerte active."}

Connexions / intégrations :
${connectionLines || "Aucune connexion configurée."}

Prévision de revenu (régression linéaire simple sur les journées enregistrées, 14 prochains jours — une estimation grossière, pas un vrai modèle prédictif) :
${forecastLines || "Pas assez de journées enregistrées pour une prévision."}

Réponds toujours en français, de façon concise et opérationnelle. Base-toi uniquement sur les données fournies ci-dessus — si une information n'y figure pas, dis clairement que tu ne l'as pas plutôt que de l'inventer. Ne fais jamais d'affirmation causale forte (« la campagne X a causé Y ») quand seule une corrélation est visible dans les données ; utilise un langage prudent (« semble corrélé à », « pourrait expliquer »). Si tu inclus une prédiction dans un artefact, utilise exactement les valeurs de la section "Prévision de revenu" ci-dessus plutôt que d'en inventer de nouvelles.

Ton rôle sur la rentabilité et la fidélisation : tu n'ajustes jamais les prix et ne proposes jamais de tarification dynamique ou automatisée — ce n'est pas un service que Flow par Minerva offre. À la place, tu analyses la rentabilité des plats (section "Rentabilité du menu" ci-dessus), tu signales les dérives de marge (coût matière qui dérape) en expliquant la cause probable plutôt qu'en suggérant un nouveau prix, et tu génères des idées concrètes de campagnes marketing pour faire revenir les clients réguliers inactifs listés dans "Clients & fidélité" (ex : offre ciblée, message de relance, rappel du programme de parrainage).`;
}

export async function ruleBasedFallback(restaurantId: string): Promise<Recommendation[]> {
  const [days, restaurantPrograms, restaurantCampaigns, restaurantConnections, transactions, rules] =
    await Promise.all([
      getServiceDays(restaurantId, { from: isoDaysAgo(CONTEXT_WINDOW_DAYS) }),
      getPrograms(restaurantId),
      getCampaigns(restaurantId),
      getConnections(restaurantId),
      getFinancialTransactions(restaurantId, { from: isoDaysAgo(CONTEXT_WINDOW_DAYS) }),
      getAlertRules(restaurantId),
    ]);

  const alerts = computeAlerts({
    serviceDays: days,
    connections: restaurantConnections,
    alertRules: rules,
    financialTransactions: transactions,
  });
  const windowRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const laborCost = computeLaborCostPct({ amount: sumLaborCost(transactions), revenue: windowRevenue });
  return computeRecommendations({
    campaigns: restaurantCampaigns,
    programs: restaurantPrograms,
    serviceDays: days,
    alerts,
    laborCostPct: laborCost.pct,
  });
}
