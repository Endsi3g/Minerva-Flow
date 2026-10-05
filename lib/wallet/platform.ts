export type WalletPlatform = "ios" | "android" | "desktop";

/** Which wallet a device can actually use. Pure so it can be tested without a browser. */
export function detectWalletPlatform(userAgent: string, platform = "", maxTouchPoints = 0): WalletPlatform {
  if (/iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export type WalletChoice = {
  /** Wallets to offer, best first. Empty means offer nothing (no dead buttons). */
  offers: ("apple" | "google")[];
  /** True when the visitor is on a computer, so we explain how to continue on a phone. */
  suggestPhone: boolean;
};

/**
 * Decide what to show. The right wallet for the device comes first and alone;
 * on a computer both are offered with a hint; a wallet the platform has not
 * configured is never shown (a dead button is worse than no button).
 */
export function chooseWalletOffers(platform: WalletPlatform, apple: boolean, google: boolean): WalletChoice {
  if (platform === "ios") return { offers: apple ? ["apple"] : [], suggestPhone: false };
  if (platform === "android") return { offers: google ? ["google"] : [], suggestPhone: false };
  const offers: ("apple" | "google")[] = [];
  if (apple) offers.push("apple");
  if (google) offers.push("google");
  return { offers, suggestPhone: offers.length > 0 };
}
