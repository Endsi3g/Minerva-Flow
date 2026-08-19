import "server-only";
import { extractMenuFromJsonLd } from "./jsonld";
import { extractMenuFromHtml } from "./embedded-state";
import { extractMenuFromVisibleText } from "./heuristic-text";
import { isAllowedByRobotsTxt } from "./robots";
import type { ProspectMenu, ProspectSourcePlatform } from "../types";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinervaMenuBot/1.0";

const DELIVERY_PLATFORMS: ProspectSourcePlatform[] = ["uber_eats", "doordash", "skipthedishes"];

export type ScrapeResult = { menu: ProspectMenu } | { error: string };

/**
 * Runs entirely inside this Next.js app — no separate service, no headless
 * browser, no new infrastructure to deploy. A plain fetch() plus three
 * extraction strategies tried in order (schema.org JSON-LD → embedded SPA
 * state → visible-text heuristic), each cheap and each optional.
 *
 * Delivery platforms (Uber Eats, DoorDash, SkipTheDishes) skip robots.txt
 * deliberately — see docs/integrations.md for why — and skip the visible-text
 * fallback, since their raw (unrendered) HTML response rarely contains
 * readable menu text even when it contains no usable embedded state either;
 * scanning it would just produce garbage. When these fail (client-only
 * rendering with nothing embedded server-side, or active bot-blocking), the
 * admin falls back to manual paste — that's the accepted, documented ceiling
 * of a browser-less scraper, not a bug to route around.
 */
export async function scrapeMenuFromUrl(
  rawUrl: string,
  platform: ProspectSourcePlatform
): Promise<ScrapeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "URL invalide." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "URL invalide." };
  }

  const isDeliveryPlatform = DELIVERY_PLATFORMS.includes(platform);

  if (!isDeliveryPlatform) {
    const allowed = await isAllowedByRobotsTxt(url.toString());
    if (!allowed) {
      return { error: "Ce site interdit le scraping dans son robots.txt — collez le menu manuellement." };
    }
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      return { error: `La page a répondu avec une erreur (${res.status}).` };
    }
    html = await res.text();
  } catch {
    return { error: "Impossible de joindre cette page (site injoignable ou trop lent)." };
  }

  const jsonLdMenu = extractMenuFromJsonLd(html);
  if (jsonLdMenu && jsonLdMenu.categories.length > 0) return { menu: jsonLdMenu };

  const stateMenu = extractMenuFromHtml(html);
  if (stateMenu.categories.length > 0) return { menu: stateMenu };

  if (!isDeliveryPlatform) {
    const textMenu = extractMenuFromVisibleText(html);
    if (textMenu.categories.length > 0) return { menu: textMenu };
  }

  return {
    error: isDeliveryPlatform
      ? "Aucun menu détecté — cette page ne peut être lue que via un navigateur (rendu JS), ce que ce scraper ne fait pas. Collez le menu manuellement."
      : "Aucun menu détecté sur cette page — collez le menu manuellement.",
  };
}
