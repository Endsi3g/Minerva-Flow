import { canonicalOrigin } from "@/lib/canonical-url";

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

export function posOauthRedirectUri(provider: "square", origin: string) {
  return `${canonicalOrigin(origin)}/api/oauth/${provider}/callback`;
}
