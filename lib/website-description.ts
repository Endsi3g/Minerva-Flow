import "server-only";
import type { OpeningHours } from "@/lib/types";

const FETCH_TIMEOUT_MS = 6000;
const MAX_DESCRIPTION_LENGTH = 500;

function normalizeUrl(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMetaDescription(html: string): string | null {
  // A tag-attribute-order-agnostic match: description content can come
  // before or after name="description" (and likewise for og:description).
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const decoded = decodeHtmlEntities(match[1]).trim();
      if (decoded) return decoded.slice(0, MAX_DESCRIPTION_LENGTH);
    }
  }
  return null;
}

/**
 * Best-effort, keyless, no external dependency — fetches a restaurant's own
 * website and pulls its <meta name="description">/og:description, to
 * pre-fill Flow's own description field. Same never-throws contract as
 * lib/geocode.ts: any failure (bad URL, timeout, non-200, no meta tag)
 * silently returns null rather than blocking the save that triggered it.
 */
export async function fetchWebsiteDescription(website: string): Promise<string | null> {
  const url = normalizeUrl(website);
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": "Minerva-Flow/1.0 (contact: quebecsaas@gmail.com)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    // Meta tags always live in <head>, well within the first chunk of a
    // normal page — reading the whole body isn't needed and risks choking
    // on very large pages.
    const html = await res.text();
    return extractMetaDescription(html);
  } catch {
    return null;
  }
}

export type WebsiteBusinessInfo = {
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  openingHours: OpeningHours | null;
};

const DAY_NAME_TO_INDEX: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  sunday: 0, sun: 0, su: 0,
  monday: 1, mon: 1, mo: 1,
  tuesday: 2, tue: 2, tu: 2,
  wednesday: 3, wed: 3, we: 3,
  thursday: 4, thu: 4, th: 4,
  friday: 5, fri: 5, fr: 5,
  saturday: 6, sat: 6, sa: 6,
};
const DAY_ORDER: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, for range expansion

function dayNameToIndex(raw: string): (0 | 1 | 2 | 3 | 4 | 5 | 6) | null {
  const key = raw.trim().replace(/^https?:\/\/schema\.org\//i, "").toLowerCase();
  return key in DAY_NAME_TO_INDEX ? DAY_NAME_TO_INDEX[key] : null;
}

function mergeDayHours(hours: OpeningHours, day: 0 | 1 | 2 | 3 | 4 | 5 | 6, open: string, close: string): void {
  const existing = hours[day];
  if (!existing) {
    hours[day] = { open, close };
  } else {
    hours[day] = { open: existing.open < open ? existing.open : open, close: existing.close > close ? existing.close : close };
  }
}

/**
 * schema.org's compact `openingHours` string format, e.g. "Mo-Fr 11:00-22:00"
 * or "Mo,Tu,We 11:00-14:00" or "Mo-Fr 11:00-14:00, Sa-Su 10:00-15:00"
 * (comma-separated day+time groups). One of two formats sites commonly emit
 * — the other, structured openingHoursSpecification, is handled separately
 * in extractJsonLdBusinessInfo.
 */
function parseCompactOpeningHours(spec: string): OpeningHours | null {
  const hours: OpeningHours = {};
  let matchedAny = false;
  // Each group: day-list, then a time range. Day-list is comma-separated
  // day names/ranges; groups are separated by commas too, so we scan
  // "<days> <hh:mm>-<hh:mm>" tokens rather than a single naive split(",").
  const groupPattern = /([A-Za-z,\-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = groupPattern.exec(spec))) {
    const [, dayList, open, close] = m;
    const days = new Set<0 | 1 | 2 | 3 | 4 | 5 | 6>();
    for (const part of dayList.split(",")) {
      const range = part.trim().split("-");
      if (range.length === 2) {
        const start = dayNameToIndex(range[0]);
        const end = dayNameToIndex(range[1]);
        if (start === null || end === null) continue;
        const startPos = DAY_ORDER.indexOf(start);
        const endPos = DAY_ORDER.indexOf(end);
        if (startPos === -1 || endPos === -1) continue;
        for (let i = startPos; i !== (endPos + 1) % 7; i = (i + 1) % 7) {
          days.add(DAY_ORDER[i]);
          if (i === endPos) break;
        }
      } else {
        const day = dayNameToIndex(part);
        if (day !== null) days.add(day);
      }
    }
    for (const day of days) {
      mergeDayHours(hours, day, open.length === 4 ? `0${open}` : open, close.length === 4 ? `0${close}` : close);
      matchedAny = true;
    }
  }
  return matchedAny ? hours : null;
}

function normalizeAddressField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Extracts business info from a single parsed JSON-LD node (already
 * unwrapped from @graph if needed) whose @type matches a restaurant/local
 * business type.
 */
function mapJsonLdNode(node: Record<string, unknown>): WebsiteBusinessInfo {
  const address = node.address as Record<string, unknown> | string | undefined;
  const addressObj = typeof address === "object" && address !== null ? address : undefined;

  let openingHours: OpeningHours | null = null;
  const spec = node.openingHoursSpecification;
  if (Array.isArray(spec)) {
    const hours: OpeningHours = {};
    let matchedAny = false;
    for (const entry of spec) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const open = normalizeAddressField(e.opens);
      const close = normalizeAddressField(e.closes);
      if (!open || !close) continue;
      const dayOfWeek = e.dayOfWeek;
      const dayValues = Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek];
      for (const d of dayValues) {
        if (typeof d !== "string") continue;
        const day = dayNameToIndex(d);
        if (day === null) continue;
        mergeDayHours(hours, day, open.slice(0, 5), close.slice(0, 5));
        matchedAny = true;
      }
    }
    if (matchedAny) openingHours = hours;
  } else if (typeof node.openingHours === "string") {
    openingHours = parseCompactOpeningHours(node.openingHours);
  } else if (Array.isArray(node.openingHours)) {
    const combined = (node.openingHours as unknown[]).filter((v): v is string => typeof v === "string").join(", ");
    openingHours = combined ? parseCompactOpeningHours(combined) : null;
  }

  return {
    phone: normalizeAddressField(node.telephone) ?? null,
    address: normalizeAddressField(addressObj?.streetAddress) ?? (typeof address === "string" ? address : null),
    city: normalizeAddressField(addressObj?.addressLocality) ?? null,
    province: normalizeAddressField(addressObj?.addressRegion) ?? null,
    postalCode: normalizeAddressField(addressObj?.postalCode) ?? null,
    openingHours,
  };
}

const BUSINESS_TYPES = ["restaurant", "localbusiness", "foodestablishment", "cafeorcoffeeshop", "bar"];

function nodeMatchesBusinessType(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && BUSINESS_TYPES.includes(t.toLowerCase()));
}

/**
 * Strategy 1 (highest confidence): schema.org JSON-LD structured data.
 * Scans every <script type="application/ld+json"> block (can appear
 * anywhere in the document, not just <head>), parses each independently so
 * one malformed/unrelated block never blocks another, unwraps one level of
 * @graph nesting (common in WordPress/Yoast SEO output), and returns the
 * first node whose @type matches a restaurant/local-business type.
 */
function extractJsonLdBusinessInfo(html: string): WebsiteBusinessInfo | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const candidates: Record<string, unknown>[] = [];
    const roots = Array.isArray(parsed) ? parsed : [parsed];
    for (const root of roots) {
      if (typeof root !== "object" || root === null) continue;
      const r = root as Record<string, unknown>;
      candidates.push(r);
      if (Array.isArray(r["@graph"])) {
        for (const node of r["@graph"] as unknown[]) {
          if (typeof node === "object" && node !== null) candidates.push(node as Record<string, unknown>);
        }
      }
    }
    const match = candidates.find(nodeMatchesBusinessType);
    if (match) return mapJsonLdNode(match);
  }
  return null;
}

/**
 * Strategy 2 (fallback): microdata (itemscope/itemtype/itemprop) — an
 * older but still common structured-data format some site builders emit
 * instead of, or alongside, JSON-LD. Deliberately simple regex extraction
 * rather than a full HTML parser (no DOM dependency in this environment):
 * finds a LocalBusiness/Restaurant itemscope block, then scans within it
 * for known itemprop attributes.
 */
function extractMicrodataBusinessInfo(html: string): WebsiteBusinessInfo | null {
  const scopeMatch = html.match(
    /<[^>]+itemscope[^>]*itemtype=["'][^"']*schema\.org\/(?:Restaurant|LocalBusiness|FoodEstablishment|CafeOrCoffeeShop|Bar)["'][^>]*>/i
  );
  if (!scopeMatch) return null;

  // Grab a bounded window after the scope tag rather than a full nested-tag
  // parse — good enough for the common case of a single-level business card.
  const windowHtml = html.slice(scopeMatch.index ?? 0, (scopeMatch.index ?? 0) + 5000);

  function propValue(prop: string): string | null {
    const contentMatch = windowHtml.match(
      new RegExp(`itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i")
    );
    if (contentMatch) return decodeHtmlEntities(contentMatch[1]).trim();
    const textMatch = windowHtml.match(new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]+)<`, "i"));
    return textMatch ? decodeHtmlEntities(textMatch[1]).trim() : null;
  }

  const phone = propValue("telephone");
  const address = propValue("streetAddress");
  const city = propValue("addressLocality");
  const province = propValue("addressRegion");
  const postalCode = propValue("postalCode");
  if (!phone && !address && !city) return null;

  return { phone, address, city, province, postalCode, openingHours: null };
}

/**
 * Strategy 3 (last resort, phone only): a `tel:` link. Structured for
 * address/hours is too unreliable to guess from freeform text without
 * real structured data, so this fallback is intentionally narrow — most
 * restaurant sites DO have a "call us" link even without any schema.org
 * markup, and a tel: href is unambiguous (unlike scanning body text for
 * phone-number-shaped substrings, which risks picking up an unrelated
 * number).
 */
function extractTelLinkPhone(html: string): string | null {
  const match = html.match(/href=["']tel:([+\d()\-.\s]+)["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Best-effort, never throws — same contract as fetchWebsiteDescription
 * above, kept as an independent function rather than folded into it so
 * that description extraction (shipped, tested) never changes behavior.
 * Tries strategies in confidence order and merges: JSON-LD first, then
 * microdata fills in whatever JSON-LD didn't have, then a tel: link fills
 * in phone specifically if still missing. Any field neither strategy finds
 * stays null — an accepted limitation, not an error.
 */
export async function fetchWebsiteBusinessInfo(website: string): Promise<WebsiteBusinessInfo | null> {
  const url = normalizeUrl(website);
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": "Minerva-Flow/1.0 (contact: quebecsaas@gmail.com)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    // Unlike the description extraction above, structured data can appear
    // anywhere in the document (not just <head>), so this reads the full body.
    const html = await res.text();

    const jsonLd = extractJsonLdBusinessInfo(html);
    const microdata = extractMicrodataBusinessInfo(html);
    const telPhone = extractTelLinkPhone(html);

    const merged: WebsiteBusinessInfo = {
      phone: jsonLd?.phone ?? microdata?.phone ?? telPhone,
      address: jsonLd?.address ?? microdata?.address ?? null,
      city: jsonLd?.city ?? microdata?.city ?? null,
      province: jsonLd?.province ?? microdata?.province ?? null,
      postalCode: jsonLd?.postalCode ?? microdata?.postalCode ?? null,
      openingHours: jsonLd?.openingHours ?? null,
    };

    const foundAnything = Object.values(merged).some((v) => v !== null);
    return foundAnything ? merged : null;
  } catch {
    return null;
  }
}
