import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "tr"],
  defaultLocale: "fr",
  // "fr" (default) keeps today's unprefixed URLs (/overview, /login, ...) so
  // existing bookmarks, magic links and QR codes never break. "tr" URLs get
  // an explicit /tr prefix.
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
