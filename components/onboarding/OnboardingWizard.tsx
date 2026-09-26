"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import Image from "next/image";
import QRCode from "qrcode";
import { Camera, Loader2, Wrench, Users, ArrowRight, Check, FileText, Landmark, Gift, Copy, MapPin, TrendingUp } from "lucide-react";
import { Onboarding, ChoiceGroup, useOnboarding, StepIndicator } from "@/components/ui/onboarding";
import { Instagram as InstagramIcon } from "@/components/ui/BrandIcons";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import type { RestaurantInput } from "@/lib/data/restaurants";
import { toast } from "sonner";
import { ImportMenuPdfModal } from "@/components/menu/ImportMenuPdfModal";
import { roleLabels } from "@/lib/app-context";
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

const ROLE_OPTIONS: Role[] = ["owner", "manager", "staff", "consultant"];

// A one-line description per role — addresses two friction points from the
// onboarding UX simulation: personas confused by what "role" even meant for
// them (Denis, Rania), and one who didn't understand "Consultant" as an
// option (Marc-André). All four kept short enough to fit under a grid item.
const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "C'est vous ? Choisissez ceci — c'est le bon choix pour la personne qui configure son établissement.",
  manager: "Gère les opérations au quotidien, sans les réglages de facturation.",
  staff: "Accès aux tâches du jour — horaires, commandes, service.",
  consultant: "Accès en lecture pour un conseiller externe (comptable, agence).",
};

type ServiceModel = "restaurant" | "cafe";

/**
 * Four steps — step 1 is still the fast, required core (name,
 * établissement, rôle); tools and team invites can be skipped, while the
 * loyalty step creates the first usable customer enrollment link. This is a departure from the prior
 * single-step design (see git history) — the onboarding UX simulation
 * surfaced real friction (wanting to connect Instagram or invite a
 * co-founder immediately, not later) that a strictly single-step flow
 * can't address without making those actions invisible.
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
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // getMyProfile() falls back to the account email when no real name was
  // ever set (same fallback the signup DB trigger uses) — showing that raw
  // email as a "prefilled" name reads as broken, so start blank instead and
  // let the placeholder guide the first real name entry.
  const [fullName, setFullName] = useState(initialFullName.includes("@") ? "" : initialFullName);
  const [role, setRole] = useState<Role>(initialRole);
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

  const { preview, loading: uploadLoading, error: uploadError, pickAndUpload } = useAvatarUpload({
    userId,
    onUploaded: (url) => setAvatarUrl(url),
  });

  const establishmentWord = serviceModel === "cafe" ? "café" : "restaurant";

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
      if (!created) return "Impossible de créer votre établissement. Réessayez.";
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
    toast.success("Fiche Google Maps associée", { description: "Adresse et informations publiques enregistrées." });
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
      if (!finished) throw new Error("Impossible de terminer la configuration. Réessayez.");
      // The onboarding completion action updates the profile through Supabase;
      // reload the app shell so its server session snapshot sees that write.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/${locale}/workspace`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  async function prepareLoyaltyJoin() {
    if (!currentRestaurantId || preparingLoyalty) return;
    setPreparingLoyalty(true);
    setLoyaltyError(null);
    try {
      const rate = Number(pointsPerDollar);
      if (!Number.isFinite(rate) || rate < 0.1 || rate > 10) throw new Error("Choisissez un taux entre 0,1 et 10 points par dollar.");
      const result = await prepareLoyaltyOnboardingAction(currentRestaurantId, rate, locale);
      if (!result.ok || !result.url) throw new Error("Impossible de préparer le lien d’inscription. Vérifiez vos droits et réessayez.");
      const qr = await QRCode.toDataURL(result.url, { width: 420, margin: 1, errorCorrectionLevel: "M" });
      setLoyaltyJoinUrl(result.url);
      setLoyaltyQrDataUrl(qr);
      toast.success("Programme prêt pour les inscriptions", { description: "Votre taux et votre QR sont enregistrés." });
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith("Choisissez")
        ? error.message
        : "Impossible de préparer le lien et le QR. Vérifiez le taux et réessayez.";
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
    toast.success("Lien d’inscription copié.");
  }

  return (
    <Onboarding
      defaultValue={1}
      totalSteps={4}
      onComplete={handleFinish}
      canGoNext={(step) => step === 1
        ? fullName.trim().length > 0 && restaurantNameInput.trim().length > 0
        : step !== 3 || Boolean(loyaltyJoinUrl)}
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
              aria-label="Changer la photo de profil"
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
            <Field label="Votre nom">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Tremblay"
                required
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-mv-ink-soft">Type d&apos;établissement</p>
              <ChoiceGroup
                name="serviceModel"
                value={serviceModel}
                onValueChange={(v) => setServiceModel(v as ServiceModel)}
                orientation="grid"
              >
                <ChoiceGroup.Item value="restaurant">Restaurant</ChoiceGroup.Item>
                <ChoiceGroup.Item value="cafe">Café</ChoiceGroup.Item>
              </ChoiceGroup>
            </div>

            <Field label={`Nom de votre ${establishmentWord}`}>
              <Input
                value={restaurantNameInput}
                onChange={(e) => setRestaurantNameInput(e.target.value)}
                placeholder={serviceModel === "cafe" ? "Ex : Café Lucide" : "Ex : Bistro du Coin"}
                required
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-mv-ink-soft">Votre rôle</p>
              <ChoiceGroup name="role" value={role} onValueChange={(v) => setRole(v as Role)} orientation="grid">
                {ROLE_OPTIONS.map((r) => (
                  <ChoiceGroup.Item key={r} value={r} className="flex-col items-start gap-1 text-left">
                    <span>{roleLabels[r]}</span>
                    <span className="text-[11px] font-normal leading-snug text-mv-ink-faint">
                      {ROLE_DESCRIPTIONS[r]}
                    </span>
                  </ChoiceGroup.Item>
                ))}
              </ChoiceGroup>
            </div>
          </div>

          {submitError && <p className="text-[12.5px] text-mv-red">{submitError}</p>}
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={2}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <Wrench className="mx-auto mb-2 text-mv-green-dark" size={22} />
            <h3 className="font-display text-[18px] font-medium text-mv-ink">Connectez vos outils</h3>
            <p className="mt-1 text-[13px] text-mv-ink-soft">
              Facultatif — vous pouvez faire ceci maintenant ou depuis Paramètres à tout moment.
            </p>
          </div>

          <a
            href="/api/oauth/instagram?mode=direct"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3.5 transition-colors hover:bg-mv-surface"
          >
            <div className="flex items-center gap-3">
              <InstagramIcon size={20} className="text-mv-ink-soft" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-mv-ink">Instagram Business</p>
                  <span className="rounded-md bg-mv-green-tint px-1.5 py-0.5 text-[10.5px] font-bold text-mv-green-dark">
                    Direct · Sans Facebook
                  </span>
                </div>
                <p className="text-[12px] text-mv-ink-faint">
                  Publiez vos visuels Marketing Studio et relances en 1 clic.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-mv-ink-faint" />
          </a>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 text-mv-green-dark" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-mv-ink">Fiche Google Maps et visibilité locale</p>
                <p className="mt-0.5 text-[12px] text-mv-ink-faint">Importez l’adresse publique pour suivre vos avis et votre présence locale.</p>
                {googlePlaceLinked && <p className="mt-2 text-[12px] font-semibold text-mv-green-dark">✓ Fiche associée</p>}
                <div className="mt-3"><GooglePlacesSearch enabled={googlePlacesEnabled} onSelect={handleGooglePlaceSelect} /></div>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-mv-cream-soft p-3 text-[11.5px] leading-relaxed text-mv-ink-soft">
                  <TrendingUp size={15} className="mt-0.5 shrink-0 text-mv-green-dark" />
                  <span><strong>Estimation indicative :</strong> Flow s’appuie uniquement sur les signaux publics de Google (avis, note et présence locale). Nous ne pouvons pas connaître vos dépenses ni vos efforts marketing actuels; aucun chiffre n’est présenté comme une prévision garantie.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-mv-green/25 bg-mv-green/[0.05] p-4">
            <p className="text-[13.5px] font-semibold text-mv-ink">Besoin d’aller plus loin ?</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">Notre offre Agence peut gérer votre marketing et certaines applications pour vous.</p>
            <Link href="/billing?plan=agency" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-mv-green-dark hover:underline">Découvrir l’offre Agence <ArrowRight size={14} /></Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/api/oauth/instagram?mode=direct" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3 hover:bg-mv-surface">
              <InstagramIcon size={20} className="text-[#E1306C]" /><span className="text-[12.5px] font-semibold text-mv-ink">Instagram Business</span><ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
            </a>
            <a href="/api/oauth/meta" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3 hover:bg-mv-surface">
              <span className="text-lg font-bold text-[#1877F2]">f</span><span className="text-[12.5px] font-semibold text-mv-ink">Facebook Page</span><ArrowRight size={14} className="ml-auto text-mv-ink-faint" />
            </a>
          </div>
          <p className="text-center text-[11.5px] text-mv-ink-faint">Instagram, Facebook et Google Business Profile sont nos premières intégrations. D’autres canaux pourront être ajoutés ensuite.</p>

          <p className="rounded-lg bg-mv-cream-soft px-3 py-2.5 text-center text-[11.5px] text-mv-ink-faint">
            Votre programme de fidélité et votre QR d’inscription se préparent à l’étape suivante.
          </p>

          <a
            href="/settings?tab=integrations"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3.5 transition-colors hover:bg-mv-surface"
          >
            <div>
              <p className="text-[13.5px] font-semibold text-mv-ink">Caisse enregistreuse et outils connectés</p>
              <p className="text-[12px] text-mv-ink-faint">Square, Stripe, Google Calendar…</p>
            </div>
            <ArrowRight size={16} className="text-mv-ink-faint" />
          </a>

          {currentRestaurantId && (
            <button
              type="button"
              onClick={() => setMenuImportOpen(true)}
              className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3.5 text-left transition-colors hover:bg-mv-surface"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-mv-ink-soft" />
                <div>
                  <p className="text-[13.5px] font-semibold text-mv-ink">Importer mon menu (PDF)</p>
                  <p className="text-[12px] text-mv-ink-faint">
                    {menuImportedCount !== null
                      ? `${menuImportedCount} plat${menuImportedCount > 1 ? "s" : ""} importé${menuImportedCount > 1 ? "s" : ""} ✓`
                      : "L'IA lit votre carte et remplit votre menu en quelques secondes."}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-mv-ink-faint" />
            </button>
          )}

          <a
            href="/api/oauth/quickbooks"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-cream-soft px-4 py-3.5 transition-colors hover:bg-mv-surface"
          >
            <div className="flex items-center gap-3">
              <Landmark size={20} className="text-mv-ink-soft" />
              <div>
                <p className="text-[13.5px] font-semibold text-mv-ink">QuickBooks</p>
                <p className="text-[12px] text-mv-ink-faint">Connectez vos dépenses depuis QuickBooks Online.</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-mv-ink-faint" />
          </a>

          <p className="text-center text-[11.5px] text-mv-ink-faint">
            Une connexion faite ici est enregistrée immédiatement — revenez simplement à cet onglet et continuez.
          </p>
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
              <h3 className="font-display text-[18px] font-medium text-mv-ink">Préparez les inscriptions fidélité</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-mv-ink-soft">Choisissez les points gagnés par dollar, puis créez un lien et un QR que vos clients peuvent scanner pour s’inscrire.</p>
            </div>
          </div>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <Field label="Points gagnés par dollar" hint="Vous pourrez ajouter vos récompenses et modifier ce taux dans Fidélisation.">
              <Input type="number" min="0.1" max="10" step="0.1" value={pointsPerDollar} onChange={(event) => setPointsPerDollar(event.target.value)} />
            </Field>
            <Button className="mt-4 w-full" onClick={prepareLoyaltyJoin} loading={preparingLoyalty} disabled={!currentRestaurantId || preparingLoyalty}>
              {loyaltyJoinUrl ? "Actualiser le QR" : "Créer mon lien et mon QR"}
            </Button>
          </div>

          {loyaltyError && <p className="text-[12.5px] text-mv-red" role="alert">{loyaltyError}</p>}

          {loyaltyJoinUrl && loyaltyQrDataUrl && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-mv-green/20 bg-mv-green/[0.04] p-4 text-center">
              <Image src={loyaltyQrDataUrl} alt={`QR d’inscription au programme de fidélité de ${restaurantNameInput}`} width={168} height={168} unoptimized className="rounded-lg bg-white p-2" />
              <div className="w-full rounded-lg border border-mv-border-soft bg-mv-surface px-3 py-2">
                <p className="truncate font-mono text-[11px] text-mv-ink-soft">{loyaltyJoinUrl}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={copyLoyaltyLink}><Copy size={13} /> {copiedLoyalty ? "Copié" : "Copier le lien"}</Button>
                <a href={loyaltyJoinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg px-3 text-[12px] font-semibold text-mv-green-dark underline underline-offset-4">Tester l’inscription client</a>
              </div>
              <p className="max-w-md text-[11.5px] leading-relaxed text-mv-ink-faint">Aucun faux membre ni récompense n’est créé. Scannez le code ou ouvrez le lien pour tester l’inscription; le consentement aux courriels reste facultatif.</p>
            </div>
          )}
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={4}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <Users className="mx-auto mb-2 text-mv-green-dark" size={22} />
            <h3 className="font-display text-[18px] font-medium text-mv-ink">Invitez votre équipe</h3>
            <p className="mt-1 text-[13px] text-mv-ink-soft">
              Facultatif — famille, employés, associé·e. Vous pourrez en ajouter d&apos;autres à tout moment depuis
              Collaborateurs.
            </p>
          </div>

          {inviteSent ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-mv-green/25 bg-mv-green/[0.06] px-4 py-3.5 text-[13px] font-semibold text-mv-green-dark">
              <Check size={16} /> Invitation envoyée à {inviteEmail.trim()}
            </div>
          ) : (
            <Field label="Courriel de la personne à inviter">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collegue@exemple.com"
              />
            </Field>
          )}

          {submitError && <p className="text-[12.5px] text-mv-red">{submitError}</p>}
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

const STEP_LABELS: Record<number, string> = { 1: "Profil", 2: "Outils", 3: "Fidélité", 4: "Équipe" };

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
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} variant="pills" className="max-w-[88px] flex-1 justify-start" />
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">
          Étape {currentStep} / {totalSteps} · {STEP_LABELS[currentStep] ?? ""}
        </span>
      </div>

      {currentStep === 1 && (
        <div className="mt-4">
          <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
            Faites connaissance
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
            Personnalisez votre profil et le nom de votre établissement.
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
  const { currentStep, totalSteps, canGoBack, canGoNext, handleBack, setStep, handleComplete } = useOnboarding();
  const isLastStep = currentStep === totalSteps;

  return (
    <fieldset className="mt-6 flex flex-col gap-2.5">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className={canGoBack ? "flex-1" : "invisible flex-1"}
          disabled={!canGoBack || submitting}
          onClick={handleBack}
        >
          Retour
        </Button>

        {currentStep === 1 ? (
          <StepOneContinueButton onContinue={onStepOneContinue} onAdvance={() => setStep(2)} />
        ) : isLastStep ? (
          <Button type="button" className="flex-1" disabled={submitting} onClick={handleComplete}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitting ? "Un instant…" : inviting ? "Envoi…" : "Terminer"}
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={currentStep === 3 && !canGoNext} onClick={() => setStep((s) => s + 1)}>
            Continuer
          </Button>
        )}
      </div>

      {currentStep > 1 && !isLastStep && currentStep !== 3 && (
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="text-center text-[12.5px] font-semibold text-mv-ink-faint hover:text-mv-ink-soft"
        >
          Plus tard
        </button>
      )}
      {isLastStep && currentStep > 1 && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="text-center text-[12.5px] font-semibold text-mv-ink-faint hover:text-mv-ink-soft"
        >
          Plus tard, terminer sans inviter
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
  const { canGoNext } = useOnboarding();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      className="flex-1"
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
      {pending ? "Un instant…" : "Continuer"}
    </Button>
  );
}
