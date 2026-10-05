/**
 * What may appear on a shareable "results" card. The one rule that matters:
 * a number only shows if it is real AND worth showing. A zero, or a rating
 * from one or two reviews, is never dressed up as an achievement.
 */
export type ShareMetricKind = "count" | "rating";

export type ShareMetric = {
  key: string;
  label: string;
  value: number;
  kind: ShareMetricKind;
};

/** Minimum number of public reviews before an average is shown at all. */
export const MIN_REVIEWS_FOR_RATING = 3;

export type RestaurantResultsInput = {
  newMembers: number;
  returningMembers: number;
  totalMembers: number;
  ordersServed: number;
  reviewAverage: number | null;
  reviewCount: number;
  periodDays: number;
};

export function restaurantShareMetrics(input: RestaurantResultsInput): ShareMetric[] {
  const period = `${input.periodDays} derniers jours`;
  const metrics: ShareMetric[] = [];
  if (input.newMembers > 0) {
    metrics.push({ key: "newMembers", label: `Nouveaux membres · ${period}`, value: input.newMembers, kind: "count" });
  }
  if (input.returningMembers > 0) {
    metrics.push({ key: "returningMembers", label: "Clients revenus au moins une fois", value: input.returningMembers, kind: "count" });
  }
  if (input.ordersServed > 0) {
    metrics.push({ key: "ordersServed", label: `Commandes servies · ${period}`, value: input.ordersServed, kind: "count" });
  }
  if (input.totalMembers > 0) {
    metrics.push({ key: "totalMembers", label: "Membres du programme fidélité", value: input.totalMembers, kind: "count" });
  }
  if (input.reviewAverage !== null && input.reviewCount >= MIN_REVIEWS_FOR_RATING) {
    metrics.push({
      key: "rating",
      label: `Note moyenne · ${input.reviewCount} avis`,
      value: Math.round(input.reviewAverage * 10) / 10,
      kind: "rating",
    });
  }
  return metrics;
}

export type MinervaResultsInput = {
  restaurantsWithMenu: number;
  restaurantsActivated: number;
  customersEnrolled: number;
  ordersServed: number;
};

/**
 * Deliberately excludes "restaurants registered" (inflated by default-named
 * and test accounts) and anything financial (MRR, churn, targets): those stay
 * internal. Every figure excludes restaurants flagged is_demo.
 */
export function minervaShareMetrics(input: MinervaResultsInput): ShareMetric[] {
  const metrics: ShareMetric[] = [];
  if (input.restaurantsWithMenu > 0) {
    metrics.push({ key: "withMenu", label: "Restaurants avec un menu en ligne", value: input.restaurantsWithMenu, kind: "count" });
  }
  if (input.restaurantsActivated > 0) {
    metrics.push({ key: "activated", label: "Restaurants avec menu et clients inscrits", value: input.restaurantsActivated, kind: "count" });
  }
  if (input.customersEnrolled > 0) {
    metrics.push({ key: "customers", label: "Clients inscrits à un programme fidélité", value: input.customersEnrolled, kind: "count" });
  }
  if (input.ordersServed > 0) {
    metrics.push({ key: "orders", label: "Commandes servies", value: input.ordersServed, kind: "count" });
  }
  return metrics;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Progress for metric `index` of `total` at global progress `t` (0..1): each
 * metric starts a little after the previous one and all finish by t = 1, so
 * the last frame always shows the true final values.
 */
export function staggeredProgress(t: number, index: number, total: number): number {
  const stagger = total > 1 ? 0.35 / (total - 1) : 0;
  const start = index * stagger;
  const span = 1 - 0.35;
  return easeOutCubic((t - start) / span);
}

export function countUpValue(metric: ShareMetric, progress: number): number {
  const eased = Math.min(1, Math.max(0, progress));
  // A rating does not "count up": it appears at its true value as soon as it
  // starts, so a half-finished animation never shows a rating that never existed.
  if (metric.kind === "rating") return eased > 0 ? metric.value : 0;
  return Math.round(metric.value * eased);
}

export function formatMetricValue(metric: ShareMetric, value: number): string {
  if (metric.kind === "rating") return `${value.toFixed(1).replace(".", ",")} ★`;
  return value.toLocaleString("fr-CA");
}
