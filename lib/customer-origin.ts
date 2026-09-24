import type { Customer } from "@/lib/types";

export type CityOrigin = { city: string; neighborhood?: string | null; label: string; customerCount: number; visits: number; spent: number };

/** Groups customers by their declared city and optional neighborhood; never reads GPS or street addresses. */
export function getCustomerOriginByCity(customers: Customer[]): CityOrigin[] {
  const map = new Map<string, CityOrigin>();
  for (const c of customers) {
    const raw = c.city?.trim();
    if (!raw) continue;
    const neighborhood = c.neighborhood?.trim() || null;
    const key = `${raw.toLowerCase()}|${neighborhood?.toLowerCase() ?? ""}`;
    const label = neighborhood ? `${neighborhood}, ${raw}` : raw;
    const entry = map.get(key) ?? { city: raw, neighborhood, label, customerCount: 0, visits: 0, spent: 0 };
    entry.customerCount += 1;
    entry.visits += c.visitCount;
    entry.spent += c.totalSpent;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
}
