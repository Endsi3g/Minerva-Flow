import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import { computeLaborCostPct, sumLaborCost } from "@/lib/engine/labor-cost";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRestaurant } from "@/lib/data/restaurants";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getAlertRules } from "@/lib/data/alerts";
import { getConnections, getFinancialTransactions } from "@/lib/data/finance";
import { getMenuItems } from "@/lib/data/menu";
import { getCustomers } from "@/lib/data/customers";
import { getInventoryItems } from "@/lib/data/inventory";
import { classifyMenuItems, getMarginDriftItems, quadrantLabel, MARGIN_DRIFT_FOOD_COST_PCT } from "@/lib/menu-engineering";
import { getInactiveCustomers } from "@/lib/engine/retention";
import { simpleTrendForecast } from "@/lib/engine/forecast";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS as CONTEXT_WINDOW_DAYS } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

/**
 * Snapshot optimisé et compressé pour une efficience maximale des tokens.
 * Supprime le verbiage redondant et utilise des représentations concises.
 */
export async function buildRestaurantDataSnapshot(restaurantId: string): Promise<string> {
  const [
    restaurant,
    days,
    restaurantPrograms,
    restaurantCampaigns,
    alertRules,
    financialTransactions,
    restaurantConnections,
    menuItems,
    customers,
    inventoryItems,
  ] = await Promise.all([
    getRestaurant(restaurantId),
    getServiceDays(restaurantId, { from: isoDaysAgo(CONTEXT_WINDOW_DAYS) }),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getAlertRules(restaurantId),
    getFinancialTransactions(restaurantId, { from: isoDaysAgo(CONTEXT_WINDOW_DAYS) }),
    getConnections(restaurantId),
    getMenuItems(restaurantId),
    getCustomers(restaurantId),
    getInventoryItems(restaurantId),
  ]);

  // computeAlerts() est le même moteur d'alertes en direct que /overview — la table `alerts` n'est
  // jamais peuplée par ailleurs dans l'app, donc la lire directement ici renverrait toujours "aucune alerte".
  const alerts = computeAlerts({
    serviceDays: days,
    connections: restaurantConnections,
    alertRules,
    financialTransactions,
    inventoryItems,
  });

  const lowStockItems = inventoryItems.filter((i) => i.parLevel !== null && i.quantityOnHand <= i.parLevel);

  const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);

  const recentDays = days
    .slice(0, 7)
    .map(
      (d) =>
        `${formatDate(d.date)}: ${formatCurrency(d.revenue)} (${d.mainSource})${
          d.anomaly ? ` [Anomalie: ${d.anomaly}]` : ""
        }`
    )
    .join("; ");

  const programLines = restaurantPrograms
    .slice(0, 5)
    .map((p) => {
      const margin = p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : null;
      return `${p.name} (${p.status}): rev ${formatCurrency(p.revenue)}, coût ${formatCurrency(p.cost)}${margin !== null ? ` (marge ${margin}%)` : ""}`;
    })
    .join("; ");

  const campaignLines = restaurantCampaigns
    .slice(0, 5)
    .map((c) => `${c.name} (${c.status}): ${c.visites} visites, rev est. ${formatCurrency(c.estimatedRevenue)}`)
    .join("; ");

  const classifiedMenu = classifyMenuItems(menuItems);
  const marginDriftItems = getMarginDriftItems(classifiedMenu);
  
  const menuLines = classifiedMenu
    .filter((i) => i.active)
    .slice(0, 10)
    .map(
      (i) =>
        `${i.name} [${quadrantLabel[i.quadrant]}]: prix ${formatCurrency(i.price)}, food cost ${formatCurrency(i.foodCost)}${
          i.foodCostPct !== null ? ` (${Math.round(i.foodCostPct * 100)}%)` : ""
        }, ${i.unitsSold} vendus`
    )
    .join("; ");

  const marginDriftLines = marginDriftItems
    .slice(0, 4)
    .map((i) => `${i.name}: coût ${Math.round((i.foodCostPct ?? 0) * 100)}% (seuil ${Math.round(MARGIN_DRIFT_FOOD_COST_PCT * 100)}%)`)
    .join("; ");

  const inactivityThresholdDays = restaurant?.retentionInactivityDays ?? 21;
  const inactiveCustomersAll = getInactiveCustomers(customers, inactivityThresholdDays);
  const topInactive = [...inactiveCustomersAll].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);
  
  const topInactiveStr = topInactive.length
    ? topInactive.map((c) => `${c.name} (${formatCurrency(c.totalSpent)}, dernière: ${c.lastVisitAt ? formatDate(c.lastVisitAt) : "N/A"})`).join(", ")
    : "aucun";

  const alertLines = alerts
    .slice(0, 4)
    .map((a) => `[${a.severity}] ${a.title}: ${a.detail}`)
    .join("; ");

  const lowStockLines = lowStockItems
    .slice(0, 6)
    .map((i) => `${i.name}: ${i.quantityOnHand} ${i.unit} (seuil ${i.parLevel} ${i.unit})`)
    .join("; ");

  const connectionLines = restaurantConnections
    .map((c) => `${c.name}: ${c.status}`)
    .join(", ");

  const revenueForecast = simpleTrendForecast(
    days.map((d) => ({ date: d.date, value: d.revenue })),
    7
  );
  const forecastLines = revenueForecast
    .map((p) => `${formatDate(p.date)}: ${formatCurrency(p.value)}`)
    .join("; ");

  return `Tu es l'assistant de pilotage Minerva Flow pour "${restaurant?.name ?? "Établissement"}"${restaurant?.city ? ` (${restaurant.city})` : ""}.

[DONNÉES DU RESTAURANT]
- CA 13 mois: ${formatCurrency(totalRevenue)} sur ${days.length} services | Campagnes actives: ${restaurantCampaigns.filter((c) => c.status === "active").length}
- Services récents: ${recentDays || "Aucun"}
- Programmes: ${programLines || "Aucun"}
- Menu (Top): ${menuLines || "Aucun plat"}
${marginDriftLines ? `- Dérives marge: ${marginDriftLines}\n` : ""}- Fidélité: ${customers.length} clients (${inactiveCustomersAll.length} inactifs ${inactivityThresholdDays}+ j). Top inactifs à relancer: ${topInactiveStr}
- Campagnes: ${campaignLines || "Aucune"}
- Alertes: ${alertLines || "Aucune alerte"}
- Stock bas: ${lowStockLines || "Aucun article sous le seuil"}
- Intégrations: ${connectionLines || "Aucune"}
- Prévision CA (7j): ${forecastLines || "Non disponible"}

[DIRECTIVES OPÉRATIONNELLES]
1. Réponds en français, de façon concise, chiffrée et orientée action opérationnelle.
2. Base-toi uniquement sur les données ci-dessus. Si une métrique manque, indique-le sobrement.
3. N'ajuste jamais les prix directement. Propose des actions marketing (relances ciblées) ou de maîtrise des portions/fournisseurs.`;
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
