import { describe, expect, it } from "vitest";
import { getServiceQuotePaymentLabel } from "../service-quote-status";

describe("service quote payment labels", () => {
  it("distinguishes a full payment from a partial deposit", () => {
    expect(getServiceQuotePaymentLabel("paye", 137.97, 137.97)).toBe("Payé");
    expect(getServiceQuotePaymentLabel("paye", 34.49, 137.97)).toBe("Acompte reçu");
  });

  it("shows the balance due when an online deposit was paid but the quote is not fully paid", () => {
    expect(getServiceQuotePaymentLabel("en_attente", 34.49, 137.97)).toBe("Solde à payer");
    expect(getServiceQuotePaymentLabel("en_attente", 0, 137.97)).toBe("Paiement en attente");
  });

  it("keeps failed and pay-at-receipt states explicit", () => {
    expect(getServiceQuotePaymentLabel("echoue", 0, 100)).toBe("Paiement échoué");
    expect(getServiceQuotePaymentLabel("non_requis", 0, 100)).toBe("Paiement sur place");
    expect(getServiceQuotePaymentLabel(null, null, null)).toBe("Paiement sur place");
  });
});
