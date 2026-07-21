import "server-only";

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
