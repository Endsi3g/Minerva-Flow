/**
 * Ad platform OAuth config — same "gracefully absent until configured"
 * pattern as lib/ai/config.ts. The connect buttons in Settings stay
 * disabled/hidden until these env vars are set.
 */
export function isMetaAdsConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function isGoogleAdsConfigured() {
  // Shares the same Google OAuth app (GOOGLE_CLIENT_ID/SECRET) as every
  // other Google integration (Gmail, Drive, Sheets, Calendar, etc.) — one
  // Google Cloud project, different scopes per feature.
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function oauthRedirectUri(provider: "meta" | "google", origin: string) {
  return `${origin}/api/oauth/${provider}/callback`;
}
