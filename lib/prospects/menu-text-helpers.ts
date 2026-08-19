import type { DietaryTag } from "./types";

// Matches "12.50$", "$12.50", "12,50 $", "12 $" — the currency symbol is
// optional on either side so plain numbers next to a "$" anywhere qualify.
export const PRICE_RE = /\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?/;

const DIETARY_KEYWORDS: Array<[RegExp, DietaryTag]> = [
  [/\bv[ée]gan/i, "vegan"],
  [/v[ée]g[ée]tarien|vegetarian/i, "vegetarian"],
  [/sans gluten|gluten.?free/i, "gluten_free"],
  [/\bhalal\b/i, "halal"],
  [/\bkasher\b|\bkosher\b/i, "kosher"],
  [/\b[ée]pic[ée]|\bspicy\b|🌶/i, "spicy"],
  [/\bnoix\b|\bnuts?\b|arachides/i, "contains_nuts"],
];

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function detectDietaryTags(text: string): DietaryTag[] {
  const tags: DietaryTag[] = [];
  for (const [re, tag] of DIETARY_KEYWORDS) {
    if (re.test(text)) tags.push(tag);
  }
  return tags;
}

export function priceToCents(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    // Embedded platform state very often already stores integer cents
    // (e.g. 1250 for $12.50); a human-typed "12.50$" never reaches three
    // digits before the decimal for a menu item, so treat anything >= 100
    // as already-cents and anything smaller as dollars.
    return raw >= 100 ? Math.round(raw) : Math.round(raw * 100);
  }
  const match = raw.match(PRICE_RE);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}
