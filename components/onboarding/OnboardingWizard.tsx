"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import QRCode from "qrcode";
import { Camera, Loader2, Wrench, Users, ArrowRight, Check, FileText, Landmark, Gift, Copy, MapPin } from "lucide-react";
import { Onboarding, ChoiceGroup, useOnboarding, StepIndicator } from "@/components/ui/onboarding";
import { Instagram as InstagramIcon } from "@/components/ui/BrandIcons";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import type { RestaurantInput } from "@/lib/data/restaurants";
import { toast } from "sonner";
import { ImportMenuPdfModal } from "@/components/menu/ImportMenuPdfModal";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { updateProfileNameAction } from "@/app/[locale]/(app)/profil/actions";
import { updateRestaurantAction, createRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import {
  setMyRoleAction,
  finishOnboardingAction,
  sendTeamInviteAction,
  prepareLoyaltyOnboardingAction,
} from "@/app/[locale]/onboarding/actions";
import type { Role } from "@/lib/types";

type ServiceModel = "restaurant" | "cafe";

/**
 * Four steps — step 1 is still the fast, required core (name,
 * établissement, rôle); tools, loyalty setup and team invites are all
 * genuinely optional, each reachable via "Continuer" once configured or
 * "Plus tard" to skip. The loyalty step (step 3) must never hard-block
 * progress on prepareLoyaltyOnboardingAction succeeding — that call can
 * fail for ordinary reasons (a stale membership snapshot right after the
 * restaurant was created in step 1, a transient write error) and there is
 * no going around a step with no skip once its one action starts failing.
 * This is a departure from the prior single-step design (see git history) —
 * the onboarding UX simulation surfaced real friction (wanting to connect
 * Instagram or invite a co-founder immediately, not later) that a strictly
 * single-step flow can't address without making those actions invisible.
 */
export function OnboardingWizard({
  userId,
  googlePlacesEnabled,
  restaurantId,
  restaurantName,
  initialServiceModel,
  initialFullName,
  initialAvatarUrl,
  initialRole,
}: {
  userId: string;
  googlePlacesEnabled: boolean;
  restaurantId: string;
  restaurantName: string;
  initialServiceModel: ServiceModel;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialRole: Role;
}) {
  const t = useTranslations("onboardingWizard");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // getMyProfile() falls back to the account email when no real name was
  // ever set (same fallback the signup DB trigger uses) — showing that raw
  // email as a "prefilled" name reads as broken, so start blank instead and
  // let the placeholder guide the first real name entry.
  const [fullName, setFullName] = useState(initialFullName.includes("@") ? "" : initialFullName);
  // The person finishing onboarding created the account, so they keep the role
  // they already have (owner). Other roles come from invitations, not from here:
  // asking "what is your role?" only added a decision to the first screen.
  const role: Role = initialRole;
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [restaurantNameInput, setRestaurantNameInput] = useState(
    restaurantName === "Mon restaurant" ? "" : restaurantName
  );
  const [serviceModel, setServiceModel] = useState<ServiceModel>(initialServiceModel);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [menuImportOpen, setMenuImportOpen] = useState(false);
  const [menuImportedCount, setMenuImportedCount] = useState<number | null>(null);
  const [googlePlaceLinked, setGooglePlaceLinked] = useState(false);
  const [pointsPerDollar, setPointsPerDollar] = useState("1");
  const [loyaltyJoinUrl, setLoyaltyJoinUrl] = useState<string | null>(null);
  const [loyaltyQrDataUrl, setLoyaltyQrDataUrl] = useState<string | null>(null);
  const [preparingLoyalty, setPreparingLoyalty] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [copiedLoyalty, setCopiedLoyalty] = useState(false);

  // Tracks the restaurant once created, separately from the `restaurantId`
  // prop: an account that reaches this step with no restaurant (e.g. an
  // orphaned membership) only creates one once. Without this, retrying
  // after a downstream failure would call createRestaurantAction again on
  // the still-empty prop and leave the user owning two restaurants.
  const [currentRestaurantId, setCurrentRestaurantId] = useState(restaurantId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [done, setDone] = useState(false);

  const { preview, loading: uploadLoading, error: uploadError, pickAndUpload } = useAvatarUpload({
    userId,
    onUploaded: (url) => setAvatarUrl(url),
  });

  const establishmentWord = serviceModel === "cafe" ? t("caf2") : t("restaurantWord");

  /** Step 1 → 2: persists the required core fields, then advances. */
  async function saveCoreStep(): Promise<string | null> {
    const trimmed = fullName.trim();
    if (trimmed && trimmed !== initialFullName) {
      const result = await updateProfileNameAction(trimmed);
      if (!result.ok) return result.error;
    }

    const finalName = restaurantNameInput.trim() || restaurantName;
    let targetRestaurantId = currentRestaurantId;
    if (targetRestaurantId) {
      await updateRestaurantAction(targetRestaurantId, { name: finalName, serviceModel }).catch(() => null);
    } else {
      const created = await createRestaurantAction({ name: finalName, serviceModel });
      if (!created) return t("couldNotCreateYour");
      targetRestaurantId = created.id;
      setCurrentRestaurantId(created.id);
    }

    // createRestaurantAction always inserts the new membership as "owner"
    // — applying the chosen role here (a no-op update when it already
    // matches) covers both the newly-created and pre-existing cases.
    await setMyRoleAction(targetRestaurantId, role);
    return null;
  }

  function handleGooglePlaceSelect(patch: Partial<RestaurantInput>) {
    if (!currentRestaurantId) return;
    setGooglePlaceLinked(Boolean(patch.googlePlaceId));
    void updateRestaurantAction(currentRestaurantId, patch);
    toast.success(t("googleMapsListingLinked"), { description: t("addressAndPublicInformation") });
  }

  /**
   * Optional step 3: sends the invite only if an email was actually typed.
   * Never throws — this must not be able to block finishing onboarding
   * (see sendTeamInviteAction's doc comment for why that matters).
   */
  async function sendInviteIfFilled(): Promise<void> {
    const email = inviteEmail.trim();
    if (!email || !currentRestaurantId) return;
    setInviting(true);
    try {
      const result = await sendTeamInviteAction(currentRestaurantId, email);
      if (result.ok) setInviteSent(true);
    } catch {
      // best-effort — swallow, onboarding still finishes
    } finally {
      setInviting(false);
    }
  }

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await sendInviteIfFilled();
      const finished = await finishOnboardingAction();
      if (!finished) throw new Error(t("couldNotFinishThe"));
      // Finish on a clear "what next" screen rather than dropping the user
      // straight onto an empty dashboard. Its links do full page loads, so the
      // app shell sees the profile write that just completed onboarding.
      setDone(true);
      setSubmitting(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("somethingWentWrong"));
      setSubmitting(false);
    }
  }

  async function prepareLoyaltyJoin() {
    if (!currentRestaurantId || preparingLoyalty) return;
    setPreparingLoyalty(true);
    setLoyaltyError(null);
    try {
      const rate = Number(pointsPerDollar);
      if (!Number.isFinite(rate) || rate < 0.1 || rate > 10) throw new Error(t("chooseARateBetween"));
      const result = await prepareLoyaltyOnboardingAction(currentRestaurantId, rate, locale);
      if (!result.ok || !result.url) throw new Error(t("couldNotPrepareThe"));
      const qr = await QRCode.toDataURL(result.url, { width: 420, margin: 1, errorCorrectionLevel: "M" });
      setLoyaltyJoinUrl(result.url);
      setLoyaltyQrDataUrl(qr);
      toast.success(t("programReadyForSign"), { description: t("yourRateAndQr") });
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith("Choisissez")
        ? error.message
        : t("couldNotPrepareThe2");
      setLoyaltyError(message);
      toast.error(message);
    } finally {
      setPreparingLoyalty(false);
    }
  }

  async function copyLoyaltyLink() {
    if (!loyaltyJoinUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(loyaltyJoinUrl);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = loyaltyJoinUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    }
    setCopiedLoyalty(true);
    setTimeout(() => setCopiedLoyalty(false), 2000);
    toast.success(t("signUpLinkCopied"));
  }

  if (done) {
    const base = locale === "fr" ? "" : `/${locale}`;
    return (
      <div className="flex flex-col gap-5" role="status" aria-live="polite">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mv-green-dark">{t("setupComplete")}</p>
          <h2 className="mt-1 font-display text-[28px] font-medium leading-tight text-mv-ink">
            {restaurantNameInput.trim() || t("yourRestaurant")} est prêt.
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">
            {menuImportedCount !== null
              ? t("dishesImported", { count: menuImportedCount })
              : t("yourMenuIsNot")}
            {loyaltyJoinUrl
              ? t("yourLoyaltySignUp")
              : t("youCanCreateYour")}
          </p>
        </div>
        <ol className="flex flex-col gap-2 text-[14px] text-mv-ink">
          <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mv-green text-[12px] font-bold text-white">1</span><span>{menuImportedCount !== null ? t("checkYourMenuAnd") : t("addYourFirstDishes")}</span></li>
          <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mv-green text-[12px] font-bold text-white">2</span><span>{t("displayYourQrAt")}</span></li>
          <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mv-green text-[12px] font-bold text-white">3</span><span>{t("yourFirstCustomersSign")}</span></li>
        </ol>
        <a
          href={`${base}/menu`}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-mv-green px-4 text-[14px] font-semibold text-mv-cream-soft hover:bg-mv-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green"
        >
          {menuImportedCount !== null ? "Voir mon menu" : t("addMyMenu")}
        </a>
        <a
          href={`${base}/overview`}
          className="inline-flex min-h-12 items-center justify-center rounded-lg text-[14px] font-medium text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green"
        >
          {t("goToMyDashboard")}
        </a>
        <p className="text-center text-[14px] text-mv-ink-soft">
          Besoin d&apos;un coup de main ? <a className="font-medium text-mv-green-dark underline underline-offset-4" href="mailto:support@minervaflow.app?subject=Aide%20pour%20ma%20configuration">{t("writeToUs")}</a>, on s&apos;en occupe avec vous.
        </p>
      </div>
    );
  }

  return (
    <Onboarding
      defaultValue={1}
      totalSteps={4}
      onComplete={handleFinish}
      canGoNext={(step) => step !== 1 || (fullName.trim().length > 0 && restaurantNameInput.trim().length > 0)}
      className="border-none bg-transparent p-0 shadow-none"
    >
      <OnboardingProgressHeader />

      <Onboarding.Step step={1}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mv-green/40"
              aria-label={t("changeProfilePhoto")}
            >
              <Avatar name={fullName || "?"} src={preview ?? avatarUrl} size={72} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/35 group-hover:text-white">
                {uploadLoading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAndUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          {uploadError && <p className="text-[12px] text-mv-red">{uploadError}</p>}

          <div className="w-full space-y-4">
            <Field label={t("yourName")}>
              <Input
                className="h-12 text-[16px]"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("alexTremblay")}
                autoComplete="name"
                required
              />
            </Field>

            <div>
              <p className="mb-2 text-[14px] font-semibold text-mv-ink-soft">{t("restaurantType")}</p>
              <ChoiceGroup
                name="serviceModel"
                value={serviceModel}
                onValueChange={(v) => setServiceModel(v as ServiceModel)}
                orientation="grid"
              >
                <ChoiceGroup.Item value="restaurant">{t("restaurant")}</ChoiceGroup.Item>
                <ChoiceGroup.Item value="cafe">{t("caf")}</ChoiceGroup.Item>
              </ChoiceGroup>
            </div>

            <Field label={t("nameOfYour", { kind: establishmentWord })}>
              <Input
                className="h-12 text-[16px]"
                value={restaurantNameInput}
                onChange={(e) => setRestaurantNameInput(e.target.value)}
                placeholder={serviceModel === "cafe" ? t("eGCafLucide") : t("eGCornerBistro")}
                required
              />
            </Field>

          </div>

          {submitError && <p className="text-[14px] text-mv-red">{submitError}</p>}
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={2}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-display text-[20px] font-medium text-mv-ink">{t("putYourMenuOnline")}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-mv-ink-soft">
              {t("thisIsWhatYour")}
            </p>
          </div>

          {currentRestaurantId && (
            <button
              type="button"
              onClick={() => setMenuImportOpen(true)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-mv-green/30 bg-mv-green/[0.06] px-4 py-3.5 text-left transition-colors hover:bg-mv-green/[0.1] focus-visible:outline-2 focus-visible:outline-mv-green"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={20} className="shrink-0 text-mv-green-dark" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-mv-ink">{t("importMyMenuPdf")}</p>
                  <p className="text-[12px] text-mv-ink-soft">
                    {menuImportedCount !== null
                      ? t("dishesImportedCheck", { count: menuImportedCount })
                      : t("yourMenuIsReady")}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="shrink-0 text-mv-green-dark" />
            </button>
          )}

          <details className="group rounded-xl border border-mv-border bg-mv-cream-soft">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green">
              Connecter d&apos;autres outils
              <span className="text-[12px] font-normal text-mv-ink-soft group-open:hidden">{t("optional")}</span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-mv-border p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-mv-ink"><MapPin size={18} className="shrink-0 text-mv-green-dark" /> {t("googleMapsListing")}</p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{t("importsTheAddressPhone")}</p>
                {googlePlaceLinked && <p className="mt-2 text-[12px] font-semibold text-mv-green-dark">{t("listingLinked")}</p>}
                <div className="mt-3 min-w-0"><GooglePlacesSearch enabled={googlePlacesEnabled} onSelect={handleGooglePlaceSelect} /></div>
              </div>
              <a href="/api/oauth/instagram?mode=direct" target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg border border-mv-border bg-mv-surface px-3 text-[14px] font-medium text-mv-ink hover:bg-mv-cream-soft">
                <InstagramIcon size={18} className="shrink-0 text-mv-ink-soft" /> {t("instagramBusiness")} <ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
              </a>
              <a href="/api/oauth/meta" target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg border border-mv-border bg-mv-surface px-3 text-[14px] font-medium text-mv-ink hover:bg-mv-cream-soft">
                <span className="w-[18px] shrink-0 text-center font-bold text-[#1877F2]">f</span> {t("facebookPage")} <ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
              </a>
              <a href="/settings" target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg border border-mv-border bg-mv-surface px-3 text-[14px] font-medium text-mv-ink hover:bg-mv-cream-soft">
                <Wrench size={18} className="shrink-0 text-mv-ink-soft" /> {t("registerAndOtherTools")} <ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
              </a>
              <a href="/api/oauth/quickbooks" target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg border border-mv-border bg-mv-surface px-3 text-[14px] font-medium text-mv-ink hover:bg-mv-cream-soft">
                <Landmark size={18} className="shrink-0 text-mv-ink-soft" /> {t("quickbooks")} <ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
              </a>
              <p className="text-[12px] text-mv-ink-soft">{t("aConnectionMadeHere")}</p>
            </div>
          </details>
        </div>

        {currentRestaurantId && (
          <ImportMenuPdfModal
            restaurantId={currentRestaurantId}
            open={menuImportOpen}
            onClose={() => setMenuImportOpen(false)}
            onImported={(items) => setMenuImportedCount(items.length)}
          />
        )}
      </Onboarding.Step>

      <Onboarding.Step step={3}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mv-green/10 text-mv-green-dark">
              <Gift size={19} />
            </div>
            <div>
              <h3 className="font-display text-[20px] font-medium text-mv-ink">{t("prepareLoyaltySignUps")}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-mv-ink-soft">{t("oneButtonCreatesThe")}</p>
            </div>
          </div>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <details className="group mb-4 rounded-lg border border-mv-border bg-mv-cream-soft">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 text-[14px] text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green">
                <span>{t("pointsPerDollar")} <strong>{pointsPerDollar || "1"}</strong></span>
                <span className="text-[14px] font-medium text-mv-green-dark">{t("edit")}</span>
              </summary>
              <div className="border-t border-mv-border p-3">
                <Field label={t("pointsEarnedPerDollar")} hint={t("youCanAddYour")}>
                  <Input className="h-12 text-[16px]" type="number" inputMode="decimal" min="0.1" max="10" step="0.1" value={pointsPerDollar} onChange={(event) => setPointsPerDollar(event.target.value)} />
                </Field>
              </div>
            </details>
            <Button className="h-12 w-full text-[14px]" onClick={prepareLoyaltyJoin} loading={preparingLoyalty} disabled={!currentRestaurantId || preparingLoyalty}>
              {loyaltyJoinUrl ? t("refreshTheQrCode") : t("createMyLinkAnd")}
            </Button>
          </div>

          {loyaltyError && <p className="text-[14px] text-mv-red" role="alert">{loyaltyError}</p>}

          {loyaltyJoinUrl && loyaltyQrDataUrl && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-mv-green/20 bg-mv-green/[0.04] p-4 text-center">
              <Image src={loyaltyQrDataUrl} alt={t("qrAlt", { name: restaurantNameInput })} width={168} height={168} unoptimized className="rounded-lg bg-white p-2" />
              <div className="w-full rounded-lg border border-mv-border-soft bg-mv-surface px-3 py-2">
                <p className="truncate font-mono text-[12px] text-mv-ink-soft">{loyaltyJoinUrl}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={copyLoyaltyLink}><Copy size={13} /> {copiedLoyalty ? t("copied") : t("copyTheLink")}</Button>
                <a href={loyaltyJoinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg px-3 text-[12px] font-semibold text-mv-green-dark underline underline-offset-4">{t("testCustomerSignUp")}</a>
              </div>
              <p className="max-w-md text-[12px] leading-relaxed text-mv-ink-faint">{t("noFakeMemberOr")}</p>
            </div>
          )}
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={4}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <Users className="mx-auto mb-2 text-mv-green-dark" size={22} />
            <h3 className="font-display text-[20px] font-medium text-mv-ink">{t("inviteYourTeam")}</h3>
            <p className="mt-1 text-[14px] text-mv-ink-soft">
              {t("optionalFamilyEmployeesPartner")}
              Collaborateurs.
            </p>
          </div>

          {inviteSent ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-mv-green/25 bg-mv-green/[0.06] px-4 py-3.5 text-[14px] font-semibold text-mv-green-dark">
              <Check size={16} /> {t("invitationSentTo", { email: inviteEmail.trim() })}
            </div>
          ) : (
            <Field label={t("emailOfThePerson")}>
              <Input className="h-12 text-[16px]"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("colleagueExampleCom")}
              />
            </Field>
          )}

          {submitError && <p className="text-[14px] text-mv-red">{submitError}</p>}
        </div>
      </Onboarding.Step>

      <WizardFooter
        submitting={submitting}
        inviting={inviting}
        onStepOneContinue={async () => {
          const error = await saveCoreStep();
          setSubmitError(error);
          return error;
        }}
      />
    </Onboarding>
  );
}

const ONBOARDING_STEP_NAMES: Record<number, string> = { 1: "profile", 2: "menu", 3: "loyalty", 4: "team" };
const STEP_LABEL_KEYS: Record<number, string> = { 1: "stepLabelProfile", 2: "stepLabelMenu", 3: "stepLabelLoyalty", 4: "stepLabelTeam" };

/**
 * The single source of onboarding progress shown to the user — replaces a
 * previous setup where the page shell displayed a static "Étape 2/2" that
 * never moved while this wizard's own 3-step state advanced invisibly
 * underneath it (the two disagreed the moment the user left step 1). Step
 * 1's title lives here too instead of in the page shell, since steps 2/3
 * already carry their own heading and repeating "Faites connaissance" above
 * them read as a leftover from step 1.
 */
function OnboardingProgressHeader() {
  const t = useTranslations("onboardingWizard");
  const { currentStep, totalSteps } = useOnboarding();

  // One event per step reached: the funnel shows exactly where owners drop off.
  useEffect(() => {
    posthog.capture("onboarding_step_viewed", {
      step: currentStep,
      total_steps: totalSteps,
      step_name: ONBOARDING_STEP_NAMES[currentStep] ?? `step_${currentStep}`,
    });
  }, [currentStep, totalSteps]);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} variant="pills" className="max-w-[88px] flex-1 justify-start" />
        <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
          {t("stepOf", { current: currentStep, total: totalSteps, label: STEP_LABEL_KEYS[currentStep] ? t(STEP_LABEL_KEYS[currentStep]) : "" })}
        </span>
      </div>

      {currentStep === 1 && (
        <div className="mt-4">
          <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[28px]">
            Faites connaissance
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">
            {t("personalizeYourProfileAnd")}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Custom per-step footer instead of the generic Onboarding.Navigation:
 * step 1's "Continuer" has async work to run (and can fail) before
 * advancing, and the optional steps 2/3 need an explicit, always-enabled
 * "Plus tard" alongside the primary action — two things the generic
 * next/complete button pair doesn't support.
 */
function WizardFooter({
  submitting,
  inviting,
  onStepOneContinue,
}: {
  submitting: boolean;
  inviting: boolean;
  onStepOneContinue: () => Promise<string | null>;
}) {
  const t = useTranslations("onboardingWizard");
  const { currentStep, totalSteps, canGoBack, handleBack, setStep, handleComplete } = useOnboarding();
  const isLastStep = currentStep === totalSteps;

  return (
    <fieldset className="mt-6 flex flex-col gap-2.5">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className={canGoBack ? "h-12 flex-1 text-[14px]" : "hidden"}
          disabled={!canGoBack || submitting}
          onClick={handleBack}
        >
          Retour
        </Button>

        {currentStep === 1 ? (
          <StepOneContinueButton onContinue={onStepOneContinue} onAdvance={() => setStep(2)} />
        ) : isLastStep ? (
          <Button type="button" className="h-12 flex-1 text-[14px]" disabled={submitting} onClick={handleComplete}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitting ? t("oneMoment") : inviting ? t("sending") : "Terminer"}
          </Button>
        ) : (
          <Button type="button" className="h-12 flex-1 text-[14px]" disabled={submitting} onClick={() => setStep((s) => s + 1)}>
            Continuer
          </Button>
        )}
      </div>

      {currentStep > 1 && !isLastStep && (
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="min-h-12 rounded-lg text-center text-[14px] font-medium text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green"
        >
          {t("later")}
        </button>
      )}
      {isLastStep && currentStep > 1 && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="min-h-12 rounded-lg text-center text-[14px] font-medium text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green"
        >
          {t("laterFinishWithoutInviting")}
        </button>
      )}
    </fieldset>
  );
}

/**
 * Step 1's continue button needs its own local pending/error state since
 * the async save (profile name, restaurant, role) happens here — separate
 * from the wizard's `submitting` state, which is reserved for the final
 * step's completion so the two spinners never fight over the same flag.
 */
function StepOneContinueButton({
  onContinue,
  onAdvance,
}: {
  onContinue: () => Promise<string | null>;
  onAdvance: () => void;
}) {
  const t = useTranslations("onboardingWizard");
  const { canGoNext } = useOnboarding();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      className="h-12 flex-1 text-[14px]"
      disabled={!canGoNext || pending}
      onClick={async () => {
        setPending(true);
        try {
          const error = await onContinue();
          // Only clear `pending` on failure — on success it stays true (button
          // stays disabled, "Un instant…" stays visible) until this component
          // unmounts on step change, instead of flashing back to an idle,
          // clickable "Continuer" the user could double-click while nothing on
          // screen has changed yet.
          if (error) setPending(false);
          else onAdvance();
        } catch (error) {
          console.error("Onboarding profile step failed", error);
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : null}
      {pending ? t("oneMoment") : "Continuer"}
    </Button>
  );
}
