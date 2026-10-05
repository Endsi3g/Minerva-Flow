import { describe, expect, it } from "vitest";
import { chooseWalletOffers, detectWalletPlatform } from "../wallet/platform";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";

describe("detectWalletPlatform", () => {
  it("recognises iPhone, iPad-as-Mac and Android", () => {
    expect(detectWalletPlatform(IPHONE)).toBe("ios");
    expect(detectWalletPlatform(MAC, "MacIntel", 5)).toBe("ios");
    expect(detectWalletPlatform(ANDROID)).toBe("android");
    expect(detectWalletPlatform(MAC, "MacIntel", 0)).toBe("desktop");
  });
});

describe("chooseWalletOffers", () => {
  it("shows only the wallet the phone can use", () => {
    expect(chooseWalletOffers("ios", true, true)).toEqual({ offers: ["apple"], suggestPhone: false });
    expect(chooseWalletOffers("android", true, true)).toEqual({ offers: ["google"], suggestPhone: false });
  });
  it("never shows a wallet that is not configured", () => {
    expect(chooseWalletOffers("ios", false, true).offers).toEqual([]);
    expect(chooseWalletOffers("android", true, false).offers).toEqual([]);
    expect(chooseWalletOffers("desktop", false, false)).toEqual({ offers: [], suggestPhone: false });
  });
  it("offers both on a computer with a hint to continue on the phone", () => {
    expect(chooseWalletOffers("desktop", true, true)).toEqual({ offers: ["apple", "google"], suggestPhone: true });
    expect(chooseWalletOffers("desktop", false, true)).toEqual({ offers: ["google"], suggestPhone: true });
  });
});
