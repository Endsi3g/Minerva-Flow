import "server-only";
import * as cheerio from "cheerio";
import { nextId, priceToCents } from "../menu-text-helpers";
import type { ProspectMenu, ProspectMenuCategory, ProspectMenuItem } from "../types";

/**
 * Parses schema.org Restaurant/Menu JSON-LD (https://schema.org/Menu) out of a page's
 * raw HTML — many restaurant websites embed this for Google's rich-snippet requirements,
 * which makes it by far the most reliable extraction path when it's present, and it
 * requires no JS rendering since it's always server-rendered for search crawlers.
 */
export function extractMenuFromJsonLd(html: string): ProspectMenu | null {
  const $ = cheerio.load(html);
  const blocks: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else if (parsed && typeof parsed === "object") {
        const graph = (parsed as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) blocks.push(...graph);
        else blocks.push(parsed);
      }
    } catch {
      // Malformed JSON-LD on the page — skip it, not our problem to fix.
    }
  });

  for (const block of blocks) {
    const menuNode = findMenuNode(block);
    if (!menuNode) continue;
    const menu = buildMenuFromNode(menuNode);
    if (menu.categories.length > 0) return menu;
  }

  return null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function findMenuNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const types = asArray(obj["@type"]);

  if (types.includes("Menu")) return obj;
  if (types.includes("Restaurant") || types.includes("FoodEstablishment")) {
    const hasMenu = asArray(obj.hasMenu)[0];
    if (hasMenu && typeof hasMenu === "object") return hasMenu as Record<string, unknown>;
  }
  return null;
}

function itemFromNode(node: unknown): ProspectMenuItem | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const name = obj.name;
  if (typeof name !== "string" || !name.trim()) return null;

  const offers = asArray(obj.offers)[0] as Record<string, unknown> | undefined;
  const price = offers?.price;

  return {
    id: nextId("item"),
    name: name.trim(),
    description: typeof obj.description === "string" ? obj.description.trim() : undefined,
    priceCents: priceToCents(typeof price === "string" || typeof price === "number" ? price : null) ?? 0,
    inStock: true,
    dietaryTags: [],
    modifierGroups: [],
  };
}

function buildMenuFromNode(menuNode: Record<string, unknown>): ProspectMenu {
  const categories: ProspectMenuCategory[] = [];
  const sections = asArray(menuNode.hasMenuSection);

  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const sectionObj = section as Record<string, unknown>;
    const items = asArray(sectionObj.hasMenuItem)
      .map(itemFromNode)
      .filter((i): i is ProspectMenuItem => i !== null);
    if (items.length > 0) {
      categories.push({
        id: nextId("cat"),
        name: typeof sectionObj.name === "string" ? sectionObj.name : "Menu",
        items,
      });
    }
  }

  if (categories.length === 0) {
    const directItems = asArray(menuNode.hasMenuItem)
      .map(itemFromNode)
      .filter((i): i is ProspectMenuItem => i !== null);
    if (directItems.length > 0) {
      categories.push({ id: nextId("cat"), name: "Menu", items: directItems });
    }
  }

  return { categories };
}
