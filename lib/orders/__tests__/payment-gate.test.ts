import { describe, expect, it } from "vitest";
import { isOrderPaymentUnresolved } from "../payment-gate";

describe("order payment preparation gate", () => {
  it("blocks online payment that has not completed", () => {
    expect(isOrderPaymentUnresolved("en_attente", 0)).toBe(true);
    expect(isOrderPaymentUnresolved("echoue", 0)).toBe(true);
  });

  it("allows pay-at-receipt orders regardless of pickup or delivery fulfillment", () => {
    expect(isOrderPaymentUnresolved("non_requis", 0)).toBe(false);
  });

  it("allows a catering order once a deposit has been recorded", () => {
    expect(isOrderPaymentUnresolved("en_attente", 50)).toBe(false);
  });
});
