import type { Customer } from "@/lib/types";

export type CityOrigin = { city: string; customerCount: number; visits: number; spent: number };

/** Groups customers by the city they entered, sorted by cumulative visits — shared by the fidelisation "Provenance" card and its dedicated map page. */
export function getCustomerOriginByCity(customers: Customer[]): CityOrigin[] {
  const map = new Map<string, CityOrigin>();
  for (const c of customers) {
    const raw = c.city?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const entry = map.get(key) ?? { city: raw, customerCount: 0, visits: 0, spent: 0 };
    entry.customerCount += 1;
    entry.visits += c.visitCount;
    entry.spent += c.totalSpent;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
}
