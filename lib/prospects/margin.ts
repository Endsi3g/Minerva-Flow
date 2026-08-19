import type { ProspectMenu } from "./types";

// A typical direct-order basket carries more than one item — this multiplier
// turns "average menu item price" into a rough average order value without
// requiring real order history (there is none yet for a prospect).
const BASKET_MULTIPLIER = 1.8;

export type MarginEstimate = {
  averageItemPriceCents: number;
  averageOrderValueCents: number;
  monthlyLossCents: number;
};

export function estimateMargin(
  menu: ProspectMenu,
  commissionRatePct: number,
  assumedMonthlyOrders: number
): MarginEstimate {
  const items = menu.categories.flatMap((c) => c.items).filter((i) => i.priceCents > 0);
  const averageItemPriceCents = items.length
    ? Math.round(items.reduce((sum, i) => sum + i.priceCents, 0) / items.length)
    : 0;
  const averageOrderValueCents = Math.round(averageItemPriceCents * BASKET_MULTIPLIER);
  const monthlyLossCents = Math.round(
    (averageOrderValueCents * assumedMonthlyOrders * commissionRatePct) / 100
  );

  return { averageItemPriceCents, averageOrderValueCents, monthlyLossCents };
}
