import "server-only";
import { nextId, priceToCents } from "../menu-text-helpers";
import type { ProspectMenu, ProspectMenuCategory, ProspectMenuItem } from "../types";

/**
 * Finds and parses whatever JSON a JS SPA embeds in its own server-rendered HTML
 * (Next.js's `__NEXT_DATA__`, other `<script type="application/json">` blocks,
 * `window.__X_STATE__ = {...}` inline assignments) and duck-type-scans it for
 * menu-item-shaped objects. This is what makes menu extraction possible on
 * delivery-platform pages WITHOUT running a headless browser at all — most
 * React/Next.js apps pre-render their initial state into the raw HTML response
 * for SEO/performance, so a plain fetch() often already has everything needed.
 *
 * This intentionally does NOT hardcode a specific platform's exact JSON schema:
 * key names on Uber Eats / DoorDash change without notice and can't be verified
 * from this codebase's environment (no live network access to those sites while
 * writing this). Instead it walks the whole tree looking for dict shapes that
 * duck-type as a menu item — best-effort, not a guarantee. If a page renders its
 * menu ONLY after client-side JS executes with nothing embedded server-side,
 * this legitimately finds nothing — that's an accepted, documented limitation,
 * not a bug to route around with a headless browser.
 */

const NAME_KEYS = ["name", "title", "itemName", "displayName"];
const PRICE_KEYS = ["price", "priceCents", "displayPrice", "formattedPrice", "priceValue"];
const DESCRIPTION_KEYS = ["description", "itemDescription", "subtitle"];
const CATEGORY_NAME_KEYS = ["title", "name", "sectionName", "categoryName"];
const CATEGORY_ITEMS_KEYS = ["items", "menuItems", "products", "dishes"];

function firstPresent(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}

function looksLikeMenuItem(node: Record<string, unknown>): boolean {
  const name = firstPresent(node, NAME_KEYS);
  const price = firstPresent(node, PRICE_KEYS);
  return typeof name === "string" && name.length > 1 && price !== undefined;
}

function* walk(node: unknown): Generator<unknown> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item);
  } else if (node && typeof node === "object") {
    yield node;
    for (const value of Object.values(node as Record<string, unknown>)) yield* walk(value);
  }
}

function toItem(node: Record<string, unknown>): ProspectMenuItem {
  const price = firstPresent(node, PRICE_KEYS);
  return {
    id: nextId("item"),
    name: String(firstPresent(node, NAME_KEYS)),
    description: (() => {
      const d = firstPresent(node, DESCRIPTION_KEYS);
      return typeof d === "string" ? d : undefined;
    })(),
    priceCents: priceToCents(typeof price === "string" || typeof price === "number" ? price : null) ?? 0,
    inStock: true,
    dietaryTags: [],
    modifierGroups: [],
  };
}

export function extractMenuFromState(state: unknown): ProspectMenu {
  const seen = new Set<unknown>();
  const categories: ProspectMenuCategory[] = [];

  for (const node of walk(state)) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    const obj = node as Record<string, unknown>;

    const itemsField = firstPresent(obj, CATEGORY_ITEMS_KEYS);
    if (!Array.isArray(itemsField) || itemsField.length === 0) continue;

    const candidateItems = itemsField.filter(
      (i): i is Record<string, unknown> => !!i && typeof i === "object" && !Array.isArray(i) && looksLikeMenuItem(i as Record<string, unknown>)
    );
    if (candidateItems.length === 0) continue;

    const built: ProspectMenuItem[] = [];
    for (const raw of candidateItems) {
      if (seen.has(raw)) continue;
      seen.add(raw);
      built.push(toItem(raw));
    }
    if (built.length > 0) {
      const categoryName = firstPresent(obj, CATEGORY_NAME_KEYS);
      categories.push({
        id: nextId("cat"),
        name: typeof categoryName === "string" ? categoryName : "Menu",
        items: built,
      });
    }
  }

  if (categories.length === 0) {
    const uncategorized: ProspectMenuItem[] = [];
    for (const node of walk(state)) {
      if (!node || typeof node !== "object" || Array.isArray(node) || seen.has(node)) continue;
      const obj = node as Record<string, unknown>;
      if (looksLikeMenuItem(obj)) {
        seen.add(obj);
        uncategorized.push(toItem(obj));
      }
    }
    if (uncategorized.length > 0) {
      categories.push({ id: nextId("cat"), name: "Menu", items: uncategorized });
    }
  }

  return { categories };
}

// [\s\S] instead of a dotAll "s" flag — this file's TS target predates es2018.
const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
const JSON_SCRIPT_RE = /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
const INLINE_STATE_RE = /window\.__[A-Za-z0-9_]*(?:STATE|DATA|PROPS)__\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*;/;

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Tries every known embedding pattern in order, returning the first non-empty menu found. */
export function extractMenuFromHtml(html: string): ProspectMenu {
  const nextDataMatch = html.match(NEXT_DATA_RE);
  if (nextDataMatch) {
    const state = tryParse(nextDataMatch[1]);
    if (state) {
      const menu = extractMenuFromState(state);
      if (menu.categories.length > 0) return menu;
    }
  }

  for (const match of html.matchAll(JSON_SCRIPT_RE)) {
    const state = tryParse(match[1]);
    if (!state) continue;
    const menu = extractMenuFromState(state);
    if (menu.categories.length > 0) return menu;
  }

  const inlineMatch = html.match(INLINE_STATE_RE);
  if (inlineMatch) {
    const state = tryParse(inlineMatch[1]);
    if (state) {
      const menu = extractMenuFromState(state);
      if (menu.categories.length > 0) return menu;
    }
  }

  return { categories: [] };
}
