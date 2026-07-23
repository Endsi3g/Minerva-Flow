/**
 * Utility functions for cleaning restaurant website URLs
 * and fetching high-res brand favicons.
 */

export function cleanWebsiteUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export function extractDomain(rawUrl: string): string {
  try {
    const cleaned = cleanWebsiteUrl(rawUrl);
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return rawUrl.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  }
}

/**
 * Returns a high-res Google Favicon API URL for any restaurant domain,
 * with DuckDuckGo fallback format.
 */
export function getRestaurantFaviconUrl(websiteUrl?: string | null, size: number = 128): string | null {
  if (!websiteUrl) return null;
  const domain = extractDomain(websiteUrl);
  if (!domain || domain.length < 3) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
