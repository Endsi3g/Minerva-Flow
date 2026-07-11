export const heatmapBuckets = ["#EDE7D6", "#C7E1D0", "#8FC7A9", "#4DA37E", "#167F5B"];

export function bucketFor(revenue: number, min: number, max: number) {
  if (max === min) return heatmapBuckets[2];
  const t = (revenue - min) / (max - min);
  const idx = Math.min(4, Math.floor(t * 5));
  return heatmapBuckets[idx];
}
