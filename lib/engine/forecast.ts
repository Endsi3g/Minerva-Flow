export type TrendPoint = { date: string; value: number };

/**
 * Naive linear-regression forecast over historical points — deliberately not
 * a real ML model. Used to label chat/report artifacts as an estimate, not a
 * guarantee: fits a straight line through the last `points.length` days and
 * projects it forward `horizonDays` days. Callers must present this as a
 * rough trend projection, never a precise prediction.
 */
export function simpleTrendForecast(points: TrendPoint[], horizonDays: number): TrendPoint[] {
  if (points.length < 2) return [];

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map((p) => p.value);
  const n = xs.length;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const lastDate = new Date(sorted[n - 1].date);
  const forecast: TrendPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const x = n - 1 + i;
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    forecast.push({
      date: date.toISOString().slice(0, 10),
      value: Math.max(0, Math.round(slope * x + intercept)),
    });
  }

  return forecast;
}
