import type { MenuItem, MenuPriceOption } from "@/lib/types";

export function normalizeMenuPriceOptions(value: unknown): MenuPriceOption[] {
  if (!Array.isArray(value) || value.length > 20) return [];
  const seen = new Set<string>();
  const result: MenuPriceOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return [];
    const option = raw as Partial<MenuPriceOption>;
    const id = typeof option.id === "string" ? option.id.trim().slice(0, 80) : "";
    const label = typeof option.label === "string" ? option.label.trim().slice(0, 80) : "";
    const quantity = Number(option.quantity);
    const price = Number(option.price);
    if (!id || seen.has(id) || !label || !Number.isInteger(quantity) || quantity < 1 || quantity > 999
      || !Number.isFinite(price) || price <= 0 || price > 1_000_000) return [];
    seen.add(id);
    result.push({ id, label, quantity, price: Math.round(price * 100) / 100 });
  }
  return result.sort((a, b) => a.quantity - b.quantity || a.label.localeCompare(b.label));
}

export function hasValidMenuPricing(item: Pick<MenuItem, "price" | "priceOptions">): boolean {
  return Number.isFinite(item.price) && item.price > 0 || normalizeMenuPriceOptions(item.priceOptions).length > 0;
}

export function menuStartingPrice(item: Pick<MenuItem, "price" | "priceOptions">): number {
  const options = normalizeMenuPriceOptions(item.priceOptions);
  return options.length ? Math.min(...options.map((option) => option.price)) : item.price;
}

export function findMenuPriceOption(
  options: MenuPriceOption[] | undefined,
  optionId: string | null | undefined
): MenuPriceOption | null {
  if (!optionId) return null;
  return normalizeMenuPriceOptions(options).find((option) => option.id === optionId) ?? null;
}
