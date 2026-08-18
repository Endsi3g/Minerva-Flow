import type { ProspectMenu, ProspectMenuCategory, ProspectMenuItem, DietaryTag } from "./types";

// Matches "12.50$", "$12.50", "12,50 $", "12 $" — the currency symbol is
// optional on either side so plain numbers next to a "$" anywhere qualify.
const PRICE_RE = /\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?/;
const HEADER_RE = /^[A-Za-zÀ-ÿ0-9 '&/-]{2,40}:?$/;

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
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function detectDietaryTags(text: string): DietaryTag[] {
  const tags: DietaryTag[] = [];
  for (const [re, tag] of DIETARY_KEYWORDS) {
    if (re.test(text)) tags.push(tag);
  }
  return tags;
}

function extractPriceCents(line: string): number | null {
  const match = line.match(PRICE_RE);
  if (!match) return null;
  const numeric = match[1].replace(",", ".");
  const value = Number.parseFloat(numeric);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function stripPrice(line: string): string {
  return line.replace(PRICE_RE, "").replace(/[-–:.\s]+$/, "").trim();
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
  if (nonEmptyCategories.length === 0) {
    return buildPlaceholderMenu();
  }

  return { categories: nonEmptyCategories };
}

/** Used when the admin generates a prospect from a URL alone, with no pasted text yet. */
export function buildPlaceholderMenu(): ProspectMenu {
  const placeholder: ProspectMenuCategory[] = [
    {
      id: nextId("cat"),
      name: "Entrées",
      items: [
        {
          id: nextId("item"),
          name: "Soupe du jour",
          description: "À remplacer par les vrais plats du restaurant.",
          priceCents: 895,
          inStock: true,
          dietaryTags: [],
          modifierGroups: [],
        },
        {
          id: nextId("item"),
          name: "Salade maison",
          priceCents: 1250,
          inStock: true,
          dietaryTags: ["vegetarian"],
          modifierGroups: [],
        },
      ],
    },
    {
      id: nextId("cat"),
      name: "Plats principaux",
      items: [
        {
          id: nextId("item"),
          name: "Plat signature",
          priceCents: 2200,
          inStock: true,
          dietaryTags: [],
          modifierGroups: [],
        },
        {
          id: nextId("item"),
          name: "Option végétarienne",
          priceCents: 1900,
          inStock: true,
          dietaryTags: ["vegetarian"],
          modifierGroups: [],
        },
      ],
    },
    {
      id: nextId("cat"),
      name: "Desserts",
      items: [
        {
          id: nextId("item"),
          name: "Dessert du jour",
          priceCents: 850,
          inStock: true,
          dietaryTags: [],
          modifierGroups: [],
        },
      ],
    },
  ];

  return { categories: placeholder, isPlaceholder: true };
}
