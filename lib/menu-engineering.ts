import type { MenuItem, MenuQuadrant } from "@/lib/types";

export const quadrantLabel: Record<MenuQuadrant, string> = {
  etoile: "Étoiles",
  cheval_bataille: "Chevaux de bataille",
  enigme: "Énigmes",
  poids_mort: "Poids morts",
};

export const quadrantDescription: Record<MenuQuadrant, string> = {
  etoile: "Populaires et rentables — à mettre en valeur sur le menu.",
  cheval_bataille: "Populaires mais peu rentables — augmenter le prix ou réduire le coût.",
  enigme: "Rentables mais peu populaires — à mieux mettre en avant ou repositionner.",
  poids_mort: "Ni populaires ni rentables — candidats au retrait du menu.",
};

export type MenuItemWithQuadrant = MenuItem & {
  margin: number;
  marginPct: number | null;
  foodCostPct: number | null;
  quadrant: MenuQuadrant;
};

/**
 * Classifies active menu items into the 4 classic menu-engineering
 * quadrants, using the average margin and average units_sold across the
 * set as the popularity/profitability thresholds — there's no per-period
 * sales table (units_sold is a manually-adjusted running counter), so this
 * is a relative comparison rather than an absolute one.
 */
export function classifyMenuItems(items: MenuItem[]): MenuItemWithQuadrant[] {
  const active = items.filter((i) => i.active);
  if (active.length === 0) return [];

  const avgMargin = active.reduce((sum, i) => sum + (i.price - i.foodCost), 0) / active.length;
  const avgUnitsSold = active.reduce((sum, i) => sum + i.unitsSold, 0) / active.length;

  return items.map((item) => {
    const margin = item.price - item.foodCost;
    const marginPct = item.price > 0 ? margin / item.price : null;
    const foodCostPct = item.price > 0 ? item.foodCost / item.price : null;
    const isProfitable = margin >= avgMargin;
    const isPopular = item.unitsSold >= avgUnitsSold;

    let quadrant: MenuQuadrant;
    if (isPopular && isProfitable) quadrant = "etoile";
    else if (isPopular && !isProfitable) quadrant = "cheval_bataille";
    else if (!isPopular && isProfitable) quadrant = "enigme";
    else quadrant = "poids_mort";

    return { ...item, margin, marginPct, foodCostPct, quadrant };
  });
}
