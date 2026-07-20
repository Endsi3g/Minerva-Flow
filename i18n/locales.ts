export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "mv_locale";

export function isSupportedLocale(value: string | undefined): value is Locale {
  return Boolean(value) && (SUPPORTED_LOCALES as readonly string[]).includes(value as Locale);
}
