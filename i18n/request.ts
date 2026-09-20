import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function isPlainObject(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }

  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Base fallback messages (French)
  const defaultMessages = (await import("../messages/fr.json")).default;

  let messages = defaultMessages;
  if (locale !== "fr") {
    try {
      const requestedMessages = (await import(`../messages/${locale}.json`)).default;
      // Deep merge: requested locale overrides French, but missing keys fall back to French
      messages = deepMerge(defaultMessages, requestedMessages) as typeof defaultMessages;
    } catch (err) {
      console.warn(`[i18n] Impossible de charger messages/${locale}.json, repli sur le français:`, err);
      messages = defaultMessages;
    }
  }

  return {
    locale,
    messages,
    onError(error) {
      // Avoid spamming logs for missing messages since deepMerge covers fallbacks
      if (error.code !== "MISSING_MESSAGE") {
        console.warn("[i18n]", error.message);
      }
    },
    getMessageFallback({ error, key, namespace }) {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return fullKey;
    },
  };
});
