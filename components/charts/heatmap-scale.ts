export const heatmapBuckets = [
  "var(--mv-heat-1)",
  "var(--mv-heat-2)",
  "var(--mv-heat-3)",
  "var(--mv-heat-4)",
  "var(--mv-heat-5)",
];

export function bucketFor(revenue: number, min: number, max: number) {
  if (max === min) return heatmapBuckets[2];
  const t = (revenue - min) / (max - min);
  const idx = Math.min(4, Math.floor(t * 5));
  return heatmapBuckets[idx];
}
