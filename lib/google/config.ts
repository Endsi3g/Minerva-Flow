import { canonicalOrigin } from "@/lib/canonical-url";

/**
 * Google Workspace OAuth config — shared GOOGLE_CLIENT_ID/SECRET across
 * every Google feature (Gmail, Sheets, Drive, Calendar, Analytics), same
 * "gracefully absent until configured" pattern as lib/ai/config.ts.
 * Distinct from lib/ad-platforms/config.ts, which is the Meta/Google Ads
 * OAuth flow — different connection, different tokens, same client app.
 */
export type GoogleFeature = "gmail" | "sheets" | "drive" | "calendar" | "analytics";

export const GOOGLE_SCOPES: Record<GoogleFeature, string> = {
  gmail: "https://www.googleapis.com/auth/gmail.send",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
  drive: "https://www.googleapis.com/auth/drive.file",
  calendar: "https://www.googleapis.com/auth/calendar",
  analytics: "https://www.googleapis.com/auth/analytics.readonly",
};

export const GOOGLE_FEATURE_LABELS: Record<GoogleFeature, { title: string; description: string }> = {
  gmail: {
    title: "Gmail",
    description: "Envoie les rapports hebdomadaires depuis votre Gmail.",
  },
  sheets: {
    title: "Google Sheets",
    description: "Exporte vos rapports vers un tableur Google Sheets.",
  },
  drive: {
    title: "Google Drive",
    description: "Range les rapports exportés dans un dossier Drive dédié.",
  },
  calendar: {
    title: "Google Calendar",
    description: "Synchronise vos journées de service avec un calendrier dédié.",
  },
  analytics: {
    title: "Google Analytics",
    description: "Remplace les données simulées de la carte par vos vraies conversions en ligne.",
  },
};

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Places API uses a plain API key (billed per-request against the Google
 * Cloud project), not an OAuth client — distinct credential from
 * GOOGLE_CLIENT_ID/SECRET above even though it can live in the same
 * project. Same "gracefully absent until configured" contract.
 */
export function isGooglePlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export function googleWorkspaceRedirectUri(origin: string) {
  return `${canonicalOrigin(origin)}/api/oauth/google-workspace/callback`;
}

// Personal calendar connection is deliberately separate from the Workspace
// scopes above: any team member can connect their own calendar (read-only),
// no owner/manager gate, no gmail.send/drive/sheets access.
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function memberCalendarRedirectUri(origin: string) {
  return `${canonicalOrigin(origin)}/api/oauth/google-calendar/callback`;
}
