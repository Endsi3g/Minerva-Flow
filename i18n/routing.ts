import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // "fr" (default) keeps today's unprefixed URLs (/overview, /login, ...) so
  // existing bookmarks, magic links and QR codes never break. "en" URLs
  // get an explicit prefix (/en/...). Turkish is switched off for now (see
  // COMING_SOON_LOCALES); its catalog stays in messages/tr.json.
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

// Locales shown (disabled) in the language picker but not served yet.
export const COMING_SOON_LOCALES = ["tr"] as const;
