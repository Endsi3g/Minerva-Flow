/** Maps the app locale (fr | en) to the BCP 47 tag used by Intl date and number formatting. French is the default. */
export function intlLocale(locale?: string): string {
  return locale === "en" ? "en-CA" : "fr-CA";
}
