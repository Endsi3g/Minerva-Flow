import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  getStripeClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe/config", () => ({ getStripeClient: mocks.getStripeClient }));

import { createServiceQuoteCheckoutSession } from "../connect";

describe("service quote Stripe Checkout session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCheckoutSession.mockResolvedValue({ id: "cs_test_quote", url: "https://checkout.stripe.test/quote" });
    mocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create: mocks.createCheckoutSession } },
    });
  });

  it("uses the database quote expiry as the Stripe Checkout expiry", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const session = await createServiceQuoteCheckoutSession({
      quoteId: "quote-1",
      attempt: 1,
      restaurantId: "restaurant-1",
      connectedAccountId: "acct_restaurant",
      amountCents: 5000,
      expiresAt,
      title: "Acompte traiteur",
      description: "Traiteur ×1",
      successUrl: "https://minervaflow.app/quote/confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://minervaflow.app/quote/confirmation?payment=cancelled",
    });

    expect(session.id).toBe("cs_test_quote");
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ expires_at: expiresAt }),
      expect.objectContaining({ idempotencyKey: "service-quote-quote-1-1" })
    );
  });

  it("rejects expiry outside Stripe Checkout's supported window before contacting Stripe", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
    await expect(createServiceQuoteCheckoutSession({
      quoteId: "quote-1",
      attempt: 1,
      restaurantId: "restaurant-1",
      connectedAccountId: "acct_restaurant",
      amountCents: 5000,
      expiresAt,
      title: "Acompte traiteur",
      description: "Traiteur ×1",
      successUrl: "https://minervaflow.app/quote/confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://minervaflow.app/quote/confirmation?payment=cancelled",
    })).rejects.toThrow("L'expiration du devis doit être comprise entre 30 minutes et 24 heures.");
    expect(mocks.getStripeClient).not.toHaveBeenCalled();
  });
});
