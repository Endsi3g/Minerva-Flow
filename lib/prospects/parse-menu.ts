import type { ProspectMenu, ProspectMenuCategory, ProspectMenuItem } from "./types";
import { nextId, detectDietaryTags, priceToCents } from "./menu-text-helpers";

const HEADER_RE = /^[A-Za-zÀ-ÿ0-9 '&/-]{2,40}:?$/;

// Anchored to the end of the line — a menu line's price is its trailing
// token ("Nom du plat .... 12.50$"). Unlike PRICE_RE (used to parse an
// already-isolated price string), this must not match the first digit
// anywhere in the line, or a name like "Rouleaux impériaux (4pcs) - 6.50$"
// misreads "4" as the price and leaves "6.50$" stuck in the name.
const LINE_PRICE_RE = /\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?\s*$/;

function extractPriceCents(line: string): number | null {
  const match = line.match(LINE_PRICE_RE);
  return match ? priceToCents(match[1]) : null;
}

function stripPrice(line: string): string {
  return line.replace(LINE_PRICE_RE, "").replace(/[-–:.\s]+$/, "").trim();
}

function looksLikeHeader(line: string): boolean {
  return HEADER_RE.test(line) && !/\d{2,}/.test(line);
}

/**
 * Deterministic, LLM-free heuristic parser: pasted menu text goes in,
 * a MinervaMenuSchema-shaped category tree comes out. It's intentionally
 * simple — good enough to seed the demo, and the admin can fix anything
 * wrong in the Quick Menu Editor afterwards.
 */
export function parseMenuText(rawText: string): ProspectMenu {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const categories: ProspectMenuCategory[] = [];
  let currentCategory: ProspectMenuCategory | null = null;
  let lastItem: ProspectMenuItem | null = null;

  function ensureCategory(name: string): ProspectMenuCategory {
    const category: ProspectMenuCategory = { id: nextId("cat"), name, items: [] };
    categories.push(category);
    return category;
  }

  for (const line of lines) {
    const priceCents = extractPriceCents(line);
    const nameFromLine = priceCents !== null ? stripPrice(line) : "";

    if (priceCents !== null && nameFromLine) {
      // "Nom du plat .... 12.50$" — a full item line.
      if (!currentCategory) currentCategory = ensureCategory("Menu");
      const item: ProspectMenuItem = {
        id: nextId("item"),
        name: nameFromLine,
        priceCents,
        inStock: true,
        dietaryTags: detectDietaryTags(line),
        modifierGroups: [],
      };
      currentCategory.items.push(item);
      lastItem = item;
      continue;
    }

    if (priceCents !== null && !nameFromLine && lastItem && lastItem.priceCents === 0) {
      // A lone price line right after a name-only line — attach it.
      lastItem.priceCents = priceCents;
      continue;
    }

    if (looksLikeHeader(line)) {
      // Short, price-free line — treat as a category header.
      currentCategory = ensureCategory(line.replace(/:$/, ""));
      lastItem = null;
      continue;
    }

    if (lastItem && !lastItem.description) {
      // Longer free-text line right after an item — treat as its description.
      lastItem.description = line;
      const tags = detectDietaryTags(line);
      if (tags.length) lastItem.dietaryTags = Array.from(new Set([...lastItem.dietaryTags, ...tags]));
      continue;
    }

    // Name-only line with no price yet (two-line "Name\n$Price" format).
    if (!currentCategory) currentCategory = ensureCategory("Menu");
    const item: ProspectMenuItem = {
      id: nextId("item"),
      name: line,
      priceCents: 0,
      inStock: true,
      dietaryTags: detectDietaryTags(line),
      modifierGroups: [],
    };
    currentCategory.items.push(item);
    lastItem = item;
  }

  const nonEmptyCategories = categories.filter((c) => c.items.length > 0);
  return { categories: nonEmptyCategories };
}

/**
 * Used whenever there's no menu to work with — no text pasted, and (once wired up)
 * no menu found by the scraper either. The demo page renders a "no menu" explainer
 * variant for these instead of a fake example menu.
 */
export function emptyMenu(): ProspectMenu {
  return { categories: [] };
}
