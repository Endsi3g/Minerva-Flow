import { canonicalOrigin } from "@/lib/canonical-url";
import type { PosProvider } from "@/lib/data/pos-connections";

/**
 * Square OAuth config — same "gracefully absent until configured" pattern
 * as lib/ai/config.ts and lib/ad-platforms/config.ts. The connect button
 * in Settings stays disabled/hidden until these env vars are set, which
 * requires registering an app in the Square Developer Dashboard
 * (https://developer.squareup.com/apps) and adding the redirect URL below
 * there.
 *
 * NOT independently verified against a live Square account — built to
 * match Square's public OAuth 2.0 documentation, but test against a real
 * sandbox app before relying on it in production.
 */
export function isSquareConfigured() {
  return Boolean(process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_APPLICATION_SECRET);
}

export function squareEnvironment(): "sandbox" | "production" {
  return process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function squareBaseUrl(): string {
  return squareEnvironment() === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function posOauthRedirectUri(provider: PosProvider, origin: string) {
  return `${canonicalOrigin(origin)}/api/oauth/${provider}/callback`;
}

/**
 * Lightspeed Restaurant (K-Series) config — same "gracefully absent until
 * configured" pattern as Square above. UNVERIFIED against a live account:
 * access to the K-Series API is itself gated behind Lightspeed's
 * partner/approved-merchant program (api-portal.lsk.lightspeed.app), so
 * this was built from public API docs (api-docs.lsk.lightspeed.app) only —
 * confirm the base URLs below still match once real credentials exist.
 */
export function isLightspeedConfigured() {
  return Boolean(process.env.LIGHTSPEED_APPLICATION_ID && process.env.LIGHTSPEED_APPLICATION_SECRET);
}

export function lightspeedEnvironment(): "trial" | "production" {
  return process.env.LIGHTSPEED_ENVIRONMENT === "production" ? "production" : "trial";
}

/** Keycloak-based OIDC realm — authorize/token endpoints live under this base + /auth or /token. */
export function lightspeedAuthBaseUrl(): string {
  return lightspeedEnvironment() === "production"
    ? "https://auth.lsk-prod.app/realms/k-series/protocol/openid-connect"
    : "https://auth.lsk-demo.app/realms/k-series/protocol/openid-connect";
}

/** Data API base — REST, distinct host from the auth realm above. */
export function lightspeedApiBaseUrl(): string {
  return lightspeedEnvironment() === "production"
    ? "https://api.lsk.lightspeed.app"
    : "https://api.trial.lsk.lightspeed.app";
}

/**
 * QuickBooks Online (Intuit) config — same "gracefully absent until
 * configured" pattern as Square above. Requires registering an app at
 * https://developer.intuit.com/app/developer/myapps and adding the
 * redirect URL below there. UNVERIFIED against a live QuickBooks account —
 * built from Intuit's public OAuth 2.0 docs, confirm against a real
 * sandbox app before relying on it in production.
 */
export function isQuickBooksConfigured() {
  return Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET);
}

export function quickBooksEnvironment(): "sandbox" | "production" {
  return process.env.QUICKBOOKS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export const QUICKBOOKS_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function quickBooksApiBaseUrl(): string {
  return quickBooksEnvironment() === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}
