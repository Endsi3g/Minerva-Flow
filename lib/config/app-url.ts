/**
 * Centralized App URL Resolution with Automated Vercel Fallback
 * Ensures that all app links, auth redirects, and lifecycle emails
 * always point to an active, working endpoint even if the custom
 * domain DNS is pending or encountering network issues.
 */

export const VERCEL_FALLBACK_URL = "https://minerva-flow.vercel.app";
export const CANONICAL_DOMAIN_URL = "https://minervaflow.app";

export function getAppUrl(): string {
  // 1. Explicit environment variable if configured and not localhost
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. Production Vercel canonical URL
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProdUrl) {
    return `https://${vercelProdUrl.replace(/\/$/, "")}`;
  }

  // 3. Deployment Vercel URL
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  // 4. Default to canonical domain, or Vercel fallback
  return CANONICAL_DOMAIN_URL;
}

export function getVercelMirrorUrl(path = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd}${cleanPath}`;
  }
  return `${VERCEL_FALLBACK_URL}${cleanPath}`;
}
