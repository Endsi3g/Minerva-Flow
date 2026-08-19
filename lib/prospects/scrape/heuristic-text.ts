import "server-only";
import * as cheerio from "cheerio";
import { nextId, priceToCents } from "../menu-text-helpers";
import type { ProspectMenu, ProspectMenuItem } from "../types";

const PRICE_LINE_RE = /^(.{2,80}?)[\s.\-–]{1,4}\$?\s*(\d+(?:[.,]\d{2}))\s*\$?$/;

/**
 * Last-resort fallback when a page has neither JSON-LD nor discoverable embedded
 * state: scans the page's own visible text for "Dish name .... 12.50$"-style
 * lines — the same shape a human would type when pasting a menu by hand.
 */
export function extractMenuFromVisibleText(html: string): ProspectMenu {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  // A flat $("body").text() concatenates every element's text with no
  // separator — "<p>Soupe - 8.95$</p><p>Salade - 12.50$</p>" collapses into
  // one unbroken string with no line boundary between the two dishes. Walk
  // element by element and take each one's own direct text instead, so a
  // block-level tag boundary always becomes a line boundary, matching what
  // Scrapy's `::text` (real per-text-node selection) gives the Python spider
  // this was ported from.
  const lines: string[] = [];
  $("body")
    .find("*")
    .addBack()
    .each((_, el) => {
      const ownText = $(el)
        .contents()
        .filter((_, node) => node.type === "text")
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (ownText) lines.push(ownText);
    });

  const items: ProspectMenuItem[] = [];
  for (const line of lines) {
    const match = line.match(PRICE_LINE_RE);
    if (!match) continue;
    const name = match[1].trim().replace(/[-–:.\s]+$/, "");
    const priceCents = priceToCents(match[2]);
    if (name && priceCents) {
      items.push({
        id: nextId("item"),
        name,
        priceCents,
        inStock: true,
        dietaryTags: [],
        modifierGroups: [],
      });
    }
  }

  if (items.length === 0) return { categories: [] };
  return { categories: [{ id: nextId("cat"), name: "Menu", items }] };
}
