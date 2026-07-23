/**
 * Utility functions for cleaning restaurant website URLs
 * and fetching high-res brand favicons with Minerva Flow logo fallback.
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
 * Returns a high-res Google Favicon API URL for a valid restaurant domain,
 * or defaults to the official Minerva Flow brand logo (/icon-512.png).
 */
export function getRestaurantFaviconUrl(websiteUrl?: string | null, size: number = 128): string {
  if (!websiteUrl || !websiteUrl.trim()) return "/icon-512.png";
  const domain = extractDomain(websiteUrl);
  if (!domain || domain.length < 3 || domain.includes("localhost") || domain.includes("127.0.0.1")) {
    return "/icon-512.png";
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
