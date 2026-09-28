import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSession: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe/config", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.createSession } } }),
}));

import { createPortalOrderCheckoutSession } from "../connect";

const baseInput = {
  orderId: "order-123",
  restaurantId: "restaurant-456",
  connectedAccountId: "acct_123",
  amountCents: 2450,
  restaurantName: "Café Minerva",
  customerEmail: "client@example.com",
};

describe("createPortalOrderCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSession.mockResolvedValue({ id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" });
  });

  it("keeps the original order-level idempotency key for the first Checkout session", async () => {
    await createPortalOrderCheckoutSession(baseInput);

    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    expect(mocks.createSession.mock.calls[0][1]).toEqual({ idempotencyKey: "portal-order-order-123" });
  });

  it("retries an expired session with a deterministic, prior-session-specific key", async () => {
    await createPortalOrderCheckoutSession({ ...baseInput, retryOfSessionId: "cs_live_previous123" });
    await createPortalOrderCheckoutSession({ ...baseInput, retryOfSessionId: "cs_live_previous123" });

    expect(mocks.createSession).toHaveBeenCalledTimes(2);
    expect(mocks.createSession.mock.calls[0][1]).toEqual({
      idempotencyKey: "portal-order-order-123-retry-cs_live_previous123",
    });
    expect(mocks.createSession.mock.calls[1][1]).toEqual(mocks.createSession.mock.calls[0][1]);
    expect(mocks.createSession.mock.calls[0][0].integration_identifier)
      .toBe(mocks.createSession.mock.calls[1][0].integration_identifier);
  });

  it("rejects an untrusted prior Checkout session id before contacting Stripe", async () => {
    await expect(createPortalOrderCheckoutSession({ ...baseInput, retryOfSessionId: "https://attacker.test" }))
      .rejects.toThrow("La session Stripe précédente est invalide.");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
