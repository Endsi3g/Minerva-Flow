import { describe, expect, it } from "vitest";
import { getPublicCheckoutOptions, isQuoteFulfillmentAvailable } from "../checkout-options";

describe("public checkout choices", () => {
  it("keeps pickup payment choice separate from online availability", () => {
    expect(getPublicCheckoutOptions(["sur_place", "immediat"], true, false)).toEqual({
      fulfillmentModes: ["sur_place"],
      canPayAtReceipt: true,
      canPayOnline: true,
    });
  });

  it("allows delivery with payment collected at reception or online", () => {
    expect(getPublicCheckoutOptions(["livraison"], true, true)).toEqual({
      fulfillmentModes: ["livraison"],
      canPayAtReceipt: true,
      canPayOnline: true,
    });
  });

  it("does not offer disabled delivery or unavailable Stripe payment", () => {
    expect(getPublicCheckoutOptions(["sur_place", "livraison"], false, false)).toEqual({
      fulfillmentModes: ["sur_place"],
      canPayAtReceipt: true,
      canPayOnline: false,
    });
  });

  it("treats legacy online-only modes as pickup with online payment", () => {
    expect(getPublicCheckoutOptions(["prep_apres_paiement"], true, false)).toEqual({
      fulfillmentModes: ["sur_place"],
      canPayAtReceipt: false,
      canPayOnline: true,
    });
  });
});

describe("service quote fulfillment choices", () => {
  it("allows pickup but rejects delivery when the restaurant has disabled delivery", () => {
    expect(isQuoteFulfillmentAvailable("sur_place", false)).toBe(true);
    expect(isQuoteFulfillmentAvailable("livraison", false)).toBe(false);
  });

  it("allows delivery when the restaurant has enabled it", () => {
    expect(isQuoteFulfillmentAvailable("livraison", true)).toBe(true);
  });
});
