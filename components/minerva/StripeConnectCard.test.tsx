import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  startOnboarding: vi.fn(),
  refreshStatus: vi.fn(),
}));

vi.mock("@/lib/app-context", () => ({ useApp: () => ({ role: "owner" }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/app/[locale]/(app)/settings/stripe-connect-actions", () => ({
  getStripeConnectStatusAction: mocks.getStatus,
  startStripeConnectOnboardingAction: mocks.startOnboarding,
  refreshStripeConnectStatusAction: mocks.refreshStatus,
}));

import { StripeConnectCard } from "@/components/minerva/StripeConnectCard";

describe("StripeConnectCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("clearly marks platform Connect as unconfigured and keeps onboarding disabled", async () => {
    mocks.getStatus.mockResolvedValue({
      configured: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      apiVersion: "v2",
      transfersStatus: "unrequested",
      recipientPayoutsStatus: "unrequested",
      requirementsDueCount: 0,
    });

    render(<StripeConnectCard />);

    expect(await screen.findByText(/Stripe Connect n’est pas configuré sur cet environnement/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bientôt disponible" }).hasAttribute("disabled")).toBe(true);
    expect(mocks.startOnboarding).not.toHaveBeenCalled();
  });
});
