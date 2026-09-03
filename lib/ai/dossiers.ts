/**
 * Minerva Flow — Dossiers Contextuels RAG pour Flow AI
 * Génère des instantanés contextuels par domaine d'exploitation restaurant.
 */

import { getMenuItems } from "@/lib/data/menu";
import { getServiceDays } from "@/lib/data/service-days";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getCustomers } from "@/lib/data/customers";
import { getEmployees } from "@/lib/data/employees";
import { getAlertRules } from "@/lib/data/alerts";
import { getInventoryItems } from "@/lib/data/inventory";
import { classifyMenuItems, getMarginDriftItems, quadrantLabel } from "@/lib/menu-engineering";
import { getInactiveCustomers } from "@/lib/engine/retention";
import { computeAlerts } from "@/lib/engine/alerts";
import { formatCurrency, formatDate, isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export * from "./dossier-types";

export async function buildDossierContext(
  restaurantId: string,
  activeDossiers: string[]
): Promise<string> {
  const parts: string[] = [];

  const dossiersToRun = activeDossiers.length > 0 ? activeDossiers : ["menu", "finance", "loyalty", "operations"];

  // 1. Menu & Recettes
  if (dossiersToRun.includes("menu")) {
    try {
      const items = await getMenuItems(restaurantId);
      const classified = classifyMenuItems(items);
      const drifts = getMarginDriftItems(classified);

      const itemsSummary = classified
        .slice(0, 15)
        .map(
          (item) =>
            `- ${item.name} (${item.category ?? "Plat"}): Prix ${formatCurrency(item.price)}, Food Cost ${formatCurrency(
              item.foodCost
            )} (${item.foodCostPct ? Math.round(item.foodCostPct * 100) : 0}%), Matrice: ${quadrantLabel[item.quadrant]}, Ventes: ${item.unitsSold}`
        )
        .join("\n");

      parts.push(`### 📂 DOSSIER : MENU & RECETTES (${items.length} articles)
${itemsSummary}
${drifts.length > 0 ? `⚠️ Plats en dérive de marge (> 35% de Food Cost) : ${drifts.map((d) => d.name).join(", ")}` : "✅ Aucun plat en dérive critique de marge."}`);
    } catch (e) {
      console.error("Error building menu dossier:", e);
    }
  }

  // 2. Finances & Performance
  if (dossiersToRun.includes("finance")) {
    try {
      const historyFrom = isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS);
      const [days, transactions, connections] = await Promise.all([
        getServiceDays(restaurantId, { from: historyFrom }),
        getFinancialTransactions(restaurantId, { from: historyFrom }),
        getConnections(restaurantId),
      ]);

      const totalRevenue = days.reduce((acc, d) => acc + d.revenue, 0);

      const recentDays = days
        .slice(0, 7)
        .map((d) => `- ${formatDate(d.date)}: Ventes ${formatCurrency(d.revenue)}${d.anomaly ? ` [${d.anomaly}]` : ""}`)
        .join("\n");

      parts.push(`### 📂 DOSSIER : FINANCES & PERFORMANCE (30 derniers jours)
- Chiffre d'affaires cumulé : ${formatCurrency(totalRevenue)}
- Derniers services enregistrés :
${recentDays}
- Intégrations caisse & banque : ${connections.map((c) => `${c.name} (${c.status})`).join(", ") || "Aucune"}`);
    } catch (e) {
      console.error("Error building finance dossier:", e);
    }
  }

  // 3. Fidélisation & Cohortes
  if (dossiersToRun.includes("loyalty")) {
    try {
      const customers = await getCustomers(restaurantId);
      const inactive = getInactiveCustomers(customers, 14);

      const decouvertes = customers.filter((c) => c.visitCount === 1);
      const habitues = customers.filter((c) => c.visitCount >= 2 && c.visitCount <= 5);
      const privilegies = customers.filter((c) => c.visitCount >= 6 && c.visitCount <= 10);
      const ambassadeurs = customers.filter((c) => c.visitCount >= 11);

      parts.push(`### 📂 DOSSIER : FIDÉLISATION & COHORTES LTV (${customers.length} clients)
- Répartition : ${decouvertes.length} Découverte (1 vis.), ${habitues.length} Habitués (2-5 vis.), ${privilegies.length} Privilégiés (6-10 vis.), ${ambassadeurs.length} Ambassadeurs (11+ vis.)
- Taux de retour 2x+ : ${customers.length > 0 ? Math.round(((customers.length - decouvertes.length) / customers.length) * 100) : 0} % (Cible Minerva Flow : 75 %+)
- Clients Habitués inactifs depuis 14j+ : ${inactive.length} clients à relancer en priorité.`);
    } catch (e) {
      console.error("Error building loyalty dossier:", e);
    }
  }

  // 4. Opérations & Équipe
  if (dossiersToRun.includes("operations")) {
    try {
      const employees = await getEmployees(restaurantId);
      const employeesList = employees
        .slice(0, 10)
        .map((e) => `- ${e.fullName} (${e.roleTitle}): ${e.active ? "Actif" : "Inactif"}${e.hourlyWage ? `, taux ${formatCurrency(e.hourlyWage)}/h` : ""}`)
        .join("\n");

      parts.push(`### 📂 DOSSIER : OPÉRATIONS & ÉQUIPE (${employees.length} collaborateurs)
${employeesList || "Aucun collaborateur enregistré."}`);
    } catch (e) {
      console.error("Error building operations dossier:", e);
    }
  }

  // 5. Dossiers Personnalisés & SOPs
  if (dossiersToRun.includes("custom")) {
    try {
      const supabase = await createClient();
      const { data: docs } = await supabase
        .from("chat_project_docs")
        .select("title, content, category")
        .eq("restaurant_id", restaurantId)
        .limit(5);

      if (docs && docs.length > 0) {
        const customContent = docs.map((d) => `- [${d.category.toUpperCase()}] ${d.title}:\n${d.content.slice(0, 300)}...`).join("\n\n");
        parts.push(`### 📂 DOSSIER : SOPS & DOCUMENTS INTERNES
${customContent}`);
      }
    } catch (e) {
      console.error("Error building custom dossier:", e);
    }
  }

  return parts.join("\n\n---\n\n");
}
