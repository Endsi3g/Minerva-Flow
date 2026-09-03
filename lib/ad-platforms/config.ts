import { canonicalOrigin } from "@/lib/canonical-url";

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

export function getInstagramAppId(): string | undefined {
  return process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
}

export function getInstagramAppSecret(): string | undefined {
  return process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
}

export function isInstagramConfigured() {
  return Boolean(getInstagramAppId() && getInstagramAppSecret());
}

export const INSTAGRAM_DIRECT_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export const INSTAGRAM_FACEBOOK_SCOPES =
  "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

export function oauthRedirectUri(provider: "meta" | "google" | "instagram", origin: string) {
  return `${canonicalOrigin(origin)}/api/oauth/${provider}/callback`;
}
