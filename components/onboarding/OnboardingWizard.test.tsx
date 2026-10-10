import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const capture = vi.fn();
let stepOrderFlag: string | undefined;
let offerFlag: string | undefined;

vi.mock("posthog-js", () => ({
  default: {
    capture: (...args: unknown[]) => capture(...args),
    setPersonProperties: vi.fn(),
    getFeatureFlag: (name: string) => (name === "onboarding-step-order" ? stepOrderFlag : name === "onboarding-offer-variant" ? offerFlag : undefined),
    onFeatureFlags: (callback: () => void) => {
      callback();
      return () => {};
    },
  },
}));
vi.mock("next-intl", () => ({ useLocale: () => "fr" }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,QR") } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/places/GooglePlacesSearch", () => ({ GooglePlacesSearch: () => <div data-testid="places" /> }));
vi.mock("@/components/menu/ImportMenuPdfModal", () => ({ ImportMenuPdfModal: () => null }));

const updateProfileNameAction = vi.fn().mockResolvedValue({ ok: true });
const updateRestaurantAction = vi.fn().mockResolvedValue(null);
const createRestaurantAction = vi.fn().mockResolvedValue({ id: "new-restaurant" });
const setMyRoleAction = vi.fn().mockResolvedValue(undefined);
const saveOnboardingQualificationAction = vi.fn().mockResolvedValue(true);
const prepareLoyaltyOnboardingAction = vi.fn().mockResolvedValue({ ok: true, url: "https://minervaflow.app/join/abc" });
const finishOnboardingAction = vi.fn().mockResolvedValue(true);
const sendTeamInviteAction = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/app/[locale]/(app)/profil/actions", () => ({ updateProfileNameAction: (...a: unknown[]) => updateProfileNameAction(...a) }));
vi.mock("@/app/[locale]/(app)/settings/actions", () => ({
  updateRestaurantAction: (...a: unknown[]) => updateRestaurantAction(...a),
  createRestaurantAction: (...a: unknown[]) => createRestaurantAction(...a),
}));
vi.mock("@/app/[locale]/onboarding/actions", () => ({
  finishOnboardingAction: (...a: unknown[]) => finishOnboardingAction(...a),
  prepareLoyaltyOnboardingAction: (...a: unknown[]) => prepareLoyaltyOnboardingAction(...a),
  saveOnboardingQualificationAction: (...a: unknown[]) => saveOnboardingQualificationAction(...a),
  sendTeamInviteAction: (...a: unknown[]) => sendTeamInviteAction(...a),
  setMyRoleAction: (...a: unknown[]) => setMyRoleAction(...a),
}));

import { OnboardingWizard } from "./OnboardingWizard";

function renderWizard() {
  return render(
    <OnboardingWizard
      userId="user-1"
      googlePlacesEnabled={false}
      restaurantId=""
      restaurantName="Mon restaurant"
      initialServiceModel="restaurant"
      initialFullName=""
      initialRole="owner"
    />
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: /^(Continuer|Activer mon programme gratuitement|Je commence, gratuitement)$/ }));
const eventsOf = (name: string) => capture.mock.calls.filter(([event]) => event === name).map(([, props]) => props as Record<string, unknown>);

async function fillStepOne() {
  fireEvent.change(screen.getByPlaceholderText("Alex"), { target: { value: "Alex" } });
  fireEvent.change(screen.getByPlaceholderText("Ex. Le Coin Bistro"), { target: { value: "Chez Alex" } });
  next();
}

async function qualify() {
  await screen.findByText("Qu'est-ce qui compte le plus pour vous ?");
  expect((screen.getByRole("button", { name: "Continuer" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Faire revenir mes clients/ }));
  fireEvent.click(screen.getByRole("button", { name: /2 à 5/ }));
  fireEvent.click(screen.getByRole("button", { name: "Square" }));
  next();
}

describe("OnboardingWizard", () => {
  beforeEach(() => {
    capture.mockClear();
    vi.clearAllMocks();
    stepOrderFlag = "classic";
    offerFlag = "risk_free";
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it("runs the five screens in the classic order and finishes", async () => {
    renderWizard();

    // 1. Welcome: the first screen cannot be skipped without both names.
    await screen.findByText("Bienvenue chez Minerva Flow");
    expect((screen.getByRole("button", { name: "Continuer" }) as HTMLButtonElement).disabled).toBe(true);
    await fillStepOne();
    await waitFor(() => expect(createRestaurantAction).toHaveBeenCalledWith({ name: "Chez Alex", serviceModel: "restaurant" }));
    expect(updateProfileNameAction).toHaveBeenCalledWith("Alex");
    expect(setMyRoleAction).toHaveBeenCalledWith("new-restaurant", "owner");

    // 2. Qualification saves goals, size and POS.
    await qualify();
    await waitFor(() =>
      expect(saveOnboardingQualificationAction).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: "new-restaurant", goals: ["retention"], locationsBand: "2-5", posSystem: "square", offerVariant: "risk_free" })
      )
    );

    // 3. The program and its QR are created without a click.
    await screen.findByText("Votre programme prend vie");
    await waitFor(() => expect(prepareLoyaltyOnboardingAction).toHaveBeenCalledWith("new-restaurant", 1, "fr"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continuer" })).toBeTruthy());
    next();

    // 4. The offer: accepted event carries the A/B variant.
    await screen.findByText("Zéro risque : vous ne payez que si vos revenus augmentent.");
    next();
    await waitFor(() => expect(eventsOf("onboarding_offer_accepted")[0]).toMatchObject({ offer_variant: "risk_free" }));

    // 5. Launch is optional: finishing without anything still completes.
    await screen.findByText("Dernière étape : lancez-vous");
    fireEvent.click(screen.getByRole("button", { name: "Terminer sans rien ajouter" }));
    await screen.findByText("Chez Alex est en ligne.");
    expect(finishOnboardingAction).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("mv_onboarding_done_at")).toBeTruthy();

    // Analytics: every screen was viewed and completed once, in order.
    expect(eventsOf("onboarding_step_viewed").map((e) => e.visual_position)).toEqual([1, 2, 3, 4, 5]);
    expect(eventsOf("onboarding_step_completed").map((e) => [e.step, e.visual_position])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
    expect(eventsOf("onboarding_completed")).toHaveLength(1);
    expect(eventsOf("onboarding_qualified")[0]).toMatchObject({ goals: ["retention"], locations_band: "2-5", pos_system: "square" });
    expect(eventsOf("onboarding_step_order_assigned")[0]).toMatchObject({ variant: "classic" });
  });

  it("shows the offer before qualification in the offer-first order, and reports real positions", async () => {
    stepOrderFlag = "offer-first";
    offerFlag = "result";
    renderWizard();

    await screen.findByText("Bienvenue chez Minerva Flow");
    await fillStepOne();

    // Screen 2 is now the offer (step 4), with the "result" wording.
    await screen.findByText("Faites revenir vos clients. Ne payez que le résultat.");
    next();
    await qualify();
    await screen.findByText("Votre programme prend vie");
    await waitFor(() => expect(prepareLoyaltyOnboardingAction).toHaveBeenCalled());
    next();
    await screen.findByText("Dernière étape : lancez-vous");

    expect(eventsOf("onboarding_step_viewed").map((e) => [e.step, e.visual_position])).toEqual([[1, 1], [4, 2], [2, 3], [3, 4], [5, 5]]);
    expect(eventsOf("onboarding_step_completed").map((e) => [e.step, e.visual_position])).toEqual([[1, 1], [4, 2], [2, 3], [3, 4]]);
    expect(eventsOf("onboarding_step_order_assigned")[0]).toMatchObject({ variant: "offer-first" });
  });

  it("does not move past screen 1 when the restaurant cannot be created", async () => {
    createRestaurantAction.mockResolvedValueOnce(null);
    renderWizard();
    await screen.findByText("Bienvenue chez Minerva Flow");
    await fillStepOne();
    await waitFor(() => expect(eventsOf("onboarding_step_failed")[0]).toMatchObject({ step: 1 }));
    expect(screen.queryByText("Qu'est-ce qui compte le plus pour vous ?")).toBeNull();
    expect(eventsOf("onboarding_step_completed")).toHaveLength(0);
  });
});
