"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import posthog from "posthog-js";
import Image from "next/image";
import QRCode from "qrcode";
import { Check, Copy, FileText, Loader2, MapPin, Sparkles, Users, X } from "lucide-react";
import { Onboarding, useOnboarding, StepIndicator } from "@/components/ui/onboarding";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import type { RestaurantInput } from "@/lib/data/restaurants";
import { toast } from "sonner";
import { ImportMenuPdfModal } from "@/components/menu/ImportMenuPdfModal";
import { updateProfileNameAction } from "@/app/[locale]/(app)/profil/actions";
import { updateRestaurantAction, createRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import {
  finishOnboardingAction,
  prepareLoyaltyOnboardingAction,
  saveOnboardingQualificationAction,
  sendTeamInviteAction,
  setMyRoleAction,
} from "@/app/[locale]/onboarding/actions";
import type { Role } from "@/lib/types";

type ServiceModel = "restaurant" | "cafe";
type Lang = "fr" | "en";

const TOTAL_STEPS = 5;
const STEP_NAMES: Record<number, string> = { 1: "welcome", 2: "qualification", 3: "wow_program", 4: "offer", 5: "launch" };
const DONE_AT_KEY = "mv_onboarding_done_at";

const GOALS = ["retention", "basket", "quiet_hours", "time_saving"] as const;
const SIZES = ["1", "2-5", "6+"] as const;
const POS = ["square", "clover", "lightspeed", "other", "none"] as const;

/** A/B copy for the offer step. Only the wording changes: the offer itself is identical. */
const OFFER_VARIANTS = ["risk_free", "result"] as const;
type OfferVariant = (typeof OFFER_VARIANTS)[number];

function fallbackVariant(userId: string): OfferVariant {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return OFFER_VARIANTS[hash % OFFER_VARIANTS.length];
}

/**
 * PostHog feature flag `onboarding-offer-variant` decides the variant when it
 * exists; otherwise a stable hash of the user id splits traffic 50/50, so the
 * test runs (and is measurable via the `offer_variant` property) even before
 * the flag is created in the PostHog dashboard.
 */
function useOfferVariant(userId: string): { variant: OfferVariant; source: "flag" | "hash" } {
  const [state, setState] = useState<{ variant: OfferVariant; source: "flag" | "hash" }>(() => ({ variant: fallbackVariant(userId), source: "hash" }));
  useEffect(() => {
    const apply = () => {
      const flag = posthog.getFeatureFlag?.("onboarding-offer-variant");
      if (typeof flag === "string" && (OFFER_VARIANTS as readonly string[]).includes(flag)) {
        setState({ variant: flag as OfferVariant, source: "flag" });
      }
    };
    return posthog.onFeatureFlags?.(apply);
  }, []);
  return state;
}

const TXT = {
  fr: {
    stepOf: (current: number, minutes: number) => `Étape ${current} sur ${TOTAL_STEPS} · environ ${minutes} min`,
    back: "Retour",
    continue: "Continuer",
    later: "Plus tard",
    oneMoment: "Un instant…",
    optional: "Facultatif",
    required: "Obligatoire",
    s1Title: "Bienvenue chez Minerva Flow",
    s1Body: "En 5 minutes, votre programme de fidélité sera en ligne et vous verrez exactement ce que vos clients verront. Commençons par vous connaître.",
    yourName: "Votre prénom",
    namePlaceholder: "Alex",
    kind: "Type d'établissement",
    restaurant: "Restaurant",
    cafe: "Café",
    nameOf: (kind: string) => `Nom de votre ${kind}`,
    namePlaceholderR: "Ex. Le Coin Bistro",
    namePlaceholderC: "Ex. Café Lucide",
    s2Title: "Qu'est-ce qui compte le plus pour vous ?",
    s2Body: "Trois touches, et on adapte Minerva Flow à votre réalité.",
    goalsLabel: "Votre priorité (jusqu'à 2)",
    goals: {
      retention: "Faire revenir mes clients",
      basket: "Augmenter le panier moyen",
      quiet_hours: "Remplir les heures creuses",
      time_saving: "Gagner du temps au quotidien",
    } as Record<string, string>,
    goalPlan: {
      retention: "On met votre programme de fidélité et les relances au premier plan.",
      basket: "On vous montre les articles et offres qui font grimper le panier.",
      quiet_hours: "On vous aide à remplir les heures creuses avec des offres ciblées.",
      time_saving: "On automatise : alertes de commande, avis Google, rapports.",
    } as Record<string, string>,
    sizeLabel: "Combien d'établissements ?",
    sizes: { "1": "Un seul", "2-5": "2 à 5", "6+": "6 ou plus" } as Record<string, string>,
    posLabel: "Votre caisse",
    pos: { square: "Square", clover: "Clover", lightspeed: "Lightspeed", other: "Une autre", none: "Aucune" } as Record<string, string>,
    s3Title: "Votre programme prend vie",
    s3Body: "Voici la carte que vos clients verront. Scannez le code avec votre téléphone : c'est déjà réel.",
    s3Preparing: "Création de votre programme…",
    s3Error: "Nous n'avons pas pu créer le lien tout de suite. Vous pourrez le créer depuis Fidélisation.",
    s3Retry: "Réessayer",
    s3Card: "Carte fidélité",
    s3Rate: (rate: string) => `${rate} point par dollar dépensé`,
    s3Scan: "Scannez pour vous inscrire comme client",
    s3Copy: "Copier le lien",
    s3Copied: "Copié",
    s3Test: "Tester comme un client",
    s3Adjust: "Ajuster les points par dollar",
    s3Note: "Aucun faux client n'est créé : l'inscription de test est la vôtre.",
    s4Eyebrow: "Pourquoi Minerva Flow",
    s4Variants: {
      risk_free: {
        headline: "Zéro risque : vous ne payez que si vos revenus augmentent.",
        sub: "Pas d'abonnement. Une petite part des revenus additionnels que nous mesurons ensemble, et rien du tout s'il n'y en a pas.",
        cta: "Activer mon programme gratuitement",
      },
      result: {
        headline: "Faites revenir vos clients. Ne payez que le résultat.",
        sub: "Selon le panier, les restaurants peuvent viser jusqu'à 5 à 10 % de revenus de plus. Aucun résultat n'est garanti : voilà pourquoi vous ne payez que sur ce que nous mesurons.",
        cta: "Je commence, gratuitement",
      },
    } as Record<OfferVariant, { headline: string; sub: string; cta: string }>,
    compareHeading: "Minerva Flow, c'est différent",
    compareLeft: "Application de fidélité à forfait fixe",
    compareRight: "Minerva Flow",
    compareRows: [
      ["Vous payez chaque mois, même sans résultat.", "Vous payez seulement sur les revenus additionnels mesurés."],
      ["Carte générique, aux couleurs de la plateforme.", "Votre marque, votre liste de clients, exportable en un clic."],
      ["Vous configurez tout seul.", "On configure avec vous."],
      ["La fidélité, et c'est tout.", "Fidélité + commandes + menu + rapports."],
    ],
    stackHeading: "Ce que vous recevez",
    stack: [
      "Programme de fidélité complet : QR, carte, points, récompenses",
      "Application iPhone pour vous et pour vos clients",
      "Commandes en direct avec alerte sonore et vibration",
      "Rapports : ventes, heures de pointe, meilleurs articles",
      "Demande d'avis Google automatique 30 minutes après la commande",
      "Un humain pour la mise en place, par courriel",
    ],
    guarantee: "Garantie : aucun frais tant qu'aucun revenu additionnel n'est mesuré. Résiliation en tout temps, sans pénalité.",
    scarcity: "Accès gratuit pendant la période de développement. Avant toute facturation : avis écrit d'au moins 30 jours et votre accord explicite.",
    s5Title: "Dernière étape : lancez-vous",
    s5Body: "Rien d'obligatoire ici. Chaque action rend Minerva Flow plus utile, et vous pouvez tout faire plus tard.",
    s5Menu: "Importer mon menu (PDF)",
    s5MenuDone: (count: number) => `${count} plat${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""}`,
    s5MenuHint: "Vos clients pourront commander dès aujourd'hui.",
    s5Google: "Relier ma fiche Google",
    s5GoogleHint: "Sert à demander un avis à vos clients 30 minutes après leur commande.",
    s5GoogleDone: "Fiche reliée",
    s5Team: "Inviter un collaborateur",
    s5TeamHint: "Courriel de la personne (partenaire, gérant, employé).",
    s5TeamPlaceholder: "collegue@exemple.com",
    s5TeamSent: (email: string) => `Invitation envoyée à ${email}`,
    finish: "Terminer",
    finishLater: "Terminer sans rien ajouter",
    sending: "Envoi…",
    doneEyebrow: "C'est prêt",
    doneTitle: (name: string) => `${name} est en ligne.`,
    doneBody: "Votre programme de fidélité est actif. Le plus beau moment : votre premier client qui scanne le code.",
    doneSteps: [
      "Affichez le QR près de la caisse ou sur chaque table.",
      "Dites à vos clients : « Scannez pour cumuler des points. »",
      "Revenez ici : vous verrez la première inscription en direct.",
    ],
    doneMenu: "Voir mon menu",
    doneAddMenu: "Ajouter mon menu",
    doneDashboard: "Aller à mon tableau de bord",
    doneApp: "Installer l'app iPhone",
    help: "Besoin d'un coup de main ?",
    helpLink: "Écrivez-nous",
    helpTail: ", on s'en occupe avec vous.",
    errCreate: "Nous n'avons pas pu créer votre établissement. Réessayez.",
    errFinish: "Nous n'avons pas pu terminer la configuration.",
    errGeneric: "Une erreur est survenue.",
    rateRange: "Choisissez un taux entre 0,1 et 10.",
    googleLinked: "Fiche Google reliée",
  },
  en: {
    stepOf: (current: number, minutes: number) => `Step ${current} of ${TOTAL_STEPS} · about ${minutes} min`,
    back: "Back",
    continue: "Continue",
    later: "Later",
    oneMoment: "One moment…",
    optional: "Optional",
    required: "Required",
    s1Title: "Welcome to Minerva Flow",
    s1Body: "In 5 minutes your loyalty program will be live and you will see exactly what your customers will see. Let's start with you.",
    yourName: "Your first name",
    namePlaceholder: "Alex",
    kind: "Type of venue",
    restaurant: "Restaurant",
    cafe: "Café",
    nameOf: (kind: string) => `Name of your ${kind}`,
    namePlaceholderR: "e.g. The Corner Bistro",
    namePlaceholderC: "e.g. Café Lucide",
    s2Title: "What matters most to you?",
    s2Body: "Three taps, and we tailor Minerva Flow to your reality.",
    goalsLabel: "Your priority (up to 2)",
    goals: {
      retention: "Bring my customers back",
      basket: "Increase the average basket",
      quiet_hours: "Fill the quiet hours",
      time_saving: "Save time every day",
    } as Record<string, string>,
    goalPlan: {
      retention: "We put your loyalty program and win-back messages first.",
      basket: "We show you the items and offers that lift the basket.",
      quiet_hours: "We help you fill quiet hours with targeted offers.",
      time_saving: "We automate: order alerts, Google reviews, reports.",
    } as Record<string, string>,
    sizeLabel: "How many locations?",
    sizes: { "1": "Just one", "2-5": "2 to 5", "6+": "6 or more" } as Record<string, string>,
    posLabel: "Your point of sale",
    pos: { square: "Square", clover: "Clover", lightspeed: "Lightspeed", other: "Another one", none: "None" } as Record<string, string>,
    s3Title: "Your program comes to life",
    s3Body: "This is the card your customers will see. Scan the code with your phone: it is already real.",
    s3Preparing: "Creating your program…",
    s3Error: "We could not create the link right now. You can create it from Loyalty.",
    s3Retry: "Try again",
    s3Card: "Loyalty card",
    s3Rate: (rate: string) => `${rate} point per dollar spent`,
    s3Scan: "Scan to join as a customer",
    s3Copy: "Copy link",
    s3Copied: "Copied",
    s3Test: "Try it as a customer",
    s3Adjust: "Adjust points per dollar",
    s3Note: "No fake customer is created: the test sign-up is yours.",
    s4Eyebrow: "Why Minerva Flow",
    s4Variants: {
      risk_free: {
        headline: "Zero risk: you only pay if your revenue grows.",
        sub: "No subscription. A small share of the additional revenue we measure together, and nothing at all if there is none.",
        cta: "Activate my program for free",
      },
      result: {
        headline: "Bring your customers back. Pay only for results.",
        sub: "Depending on basket size, venues can aim for up to 5 to 10% more revenue. No result is guaranteed: that is why you only pay on what we measure.",
        cta: "Start for free",
      },
    } as Record<OfferVariant, { headline: string; sub: string; cta: string }>,
    compareHeading: "Minerva Flow is different",
    compareLeft: "Fixed-fee loyalty app",
    compareRight: "Minerva Flow",
    compareRows: [
      ["You pay every month, with or without results.", "You only pay on measured additional revenue."],
      ["Generic card in the platform's colors.", "Your brand, your customer list, exportable in one click."],
      ["You set everything up alone.", "We set it up with you."],
      ["Loyalty, and nothing else.", "Loyalty + orders + menu + reports."],
    ],
    stackHeading: "What you get",
    stack: [
      "Complete loyalty program: QR, card, points, rewards",
      "iPhone app for you and your customers",
      "Live orders with sound and vibration alerts",
      "Reports: sales, busiest hours, best sellers",
      "Automatic Google review request 30 minutes after the order",
      "A human for setup, by email",
    ],
    guarantee: "Guarantee: no fees until additional revenue is measured. Cancel any time, no penalty.",
    scarcity: "Free access during the development period. Before any billing: written notice of at least 30 days and your explicit agreement.",
    s5Title: "Last step: launch",
    s5Body: "Nothing mandatory here. Each action makes Minerva Flow more useful, and you can do it all later.",
    s5Menu: "Import my menu (PDF)",
    s5MenuDone: (count: number) => `${count} dish${count === 1 ? "" : "es"} imported`,
    s5MenuHint: "Your customers can order today.",
    s5Google: "Link my Google listing",
    s5GoogleHint: "Used to ask customers for a review 30 minutes after their order.",
    s5GoogleDone: "Listing linked",
    s5Team: "Invite a teammate",
    s5TeamHint: "Email of the person (partner, manager, employee).",
    s5TeamPlaceholder: "colleague@example.com",
    s5TeamSent: (email: string) => `Invitation sent to ${email}`,
    finish: "Finish",
    finishLater: "Finish without adding anything",
    sending: "Sending…",
    doneEyebrow: "You're set",
    doneTitle: (name: string) => `${name} is live.`,
    doneBody: "Your loyalty program is active. The best moment: your first customer scanning the code.",
    doneSteps: [
      "Display the QR near the till or on each table.",
      "Tell your customers: “Scan to earn points.”",
      "Come back here: you will see the first sign-up live.",
    ],
    doneMenu: "See my menu",
    doneAddMenu: "Add my menu",
    doneDashboard: "Go to my dashboard",
    doneApp: "Get the iPhone app",
    help: "Need a hand?",
    helpLink: "Write to us",
    helpTail: ", we'll do it with you.",
    errCreate: "We could not create your venue. Try again.",
    errFinish: "We could not finish the setup.",
    errGeneric: "Something went wrong.",
    rateRange: "Choose a rate between 0.1 and 10.",
    googleLinked: "Google listing linked",
  },
} as const;

export function OnboardingWizard({
  userId,
  googlePlacesEnabled,
  restaurantId,
  restaurantName,
  initialServiceModel,
  initialFullName,
  initialRole,
}: {
  userId: string;
  googlePlacesEnabled: boolean;
  restaurantId: string;
  restaurantName: string;
  initialServiceModel: ServiceModel;
  initialFullName: string;
  initialAvatarUrl?: string | null;
  initialRole: Role;
}) {
  const locale = useLocale();
  const lang: Lang = locale === "en" ? "en" : "fr";
  const t = TXT[lang];
  const { variant, source: variantSource } = useOfferVariant(userId);

  // getMyProfile() falls back to the account email when no real name was ever
  // set; showing that raw email as a "prefilled" name reads as broken.
  const initialFirst = initialFullName.includes("@") ? "" : initialFullName.split(" ")[0] ?? "";
  const [firstName, setFirstName] = useState(initialFirst);
  const role: Role = initialRole;
  const [restaurantNameInput, setRestaurantNameInput] = useState(restaurantName === "Mon restaurant" ? "" : restaurantName);
  const [serviceModel, setServiceModel] = useState<ServiceModel>(initialServiceModel);

  const [goals, setGoals] = useState<string[]>([]);
  const [sizeBand, setSizeBand] = useState<string | null>(null);
  const [posSystem, setPosSystem] = useState<string | null>(null);

  const [pointsPerDollar, setPointsPerDollar] = useState("1");
  const [loyaltyJoinUrl, setLoyaltyJoinUrl] = useState<string | null>(null);
  const [loyaltyQrDataUrl, setLoyaltyQrDataUrl] = useState<string | null>(null);
  const [preparingLoyalty, setPreparingLoyalty] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [copiedLoyalty, setCopiedLoyalty] = useState(false);

  const [menuImportOpen, setMenuImportOpen] = useState(false);
  const [menuImportedCount, setMenuImportedCount] = useState<number | null>(null);
  const [googlePlaceLinked, setGooglePlaceLinked] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  // Tracks the restaurant once created, separately from the `restaurantId`
  // prop, so a retry after a downstream failure never creates a second one.
  const [currentRestaurantId, setCurrentRestaurantId] = useState(restaurantId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [done, setDone] = useState(false);
  const offerViewedRef = useRef(false);

  const establishmentWord = serviceModel === "cafe" ? t.cafe.toLowerCase() : t.restaurant.toLowerCase();

  /** Step 1 → 2: persists the required core fields, then advances. */
  async function saveCoreStep(): Promise<string | null> {
    const trimmed = firstName.trim();
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
      if (!created) return t.errCreate;
      targetRestaurantId = created.id;
      setCurrentRestaurantId(created.id);
    }
    await setMyRoleAction(targetRestaurantId, role);
    return null;
  }

  /** Step 2 → 3: saves the answers. Never blocks: a failure only means we ask again later. */
  async function saveQualification(): Promise<void> {
    posthog.capture("onboarding_qualified", { goals, locations_band: sizeBand, pos_system: posSystem, service_model: serviceModel });
    posthog.setPersonProperties?.({ onboarding_goals: goals, onboarding_locations_band: sizeBand, onboarding_pos: posSystem });
    if (!currentRestaurantId) return;
    await saveOnboardingQualificationAction({
      restaurantId: currentRestaurantId,
      goals,
      locationsBand: sizeBand,
      posSystem,
      offerVariant: variant,
    }).catch(() => false);
  }

  function toggleGoal(goal: string) {
    setGoals((current) => {
      if (current.includes(goal)) return current.filter((g) => g !== goal);
      return current.length >= 2 ? [current[1], goal] : [...current, goal];
    });
  }

  const prepareLoyaltyJoin = useCallback(async () => {
    if (!currentRestaurantId || preparingLoyalty) return;
    setPreparingLoyalty(true);
    setLoyaltyError(null);
    try {
      const rate = Number(pointsPerDollar.replace(",", "."));
      if (!Number.isFinite(rate) || rate < 0.1 || rate > 10) throw new Error(t.rateRange);
      const result = await prepareLoyaltyOnboardingAction(currentRestaurantId, rate, locale);
      if (!result.ok || !result.url) throw new Error(t.s3Error);
      const qr = await QRCode.toDataURL(result.url, { width: 420, margin: 1, errorCorrectionLevel: "M" });
      setLoyaltyJoinUrl(result.url);
      setLoyaltyQrDataUrl(qr);
      posthog.capture("onboarding_program_created");
    } catch (error) {
      setLoyaltyError(error instanceof Error ? error.message : t.s3Error);
    } finally {
      setPreparingLoyalty(false);
    }
  }, [currentRestaurantId, preparingLoyalty, pointsPerDollar, locale, t]);

  /** Runs the automatic "wow" the first time step 3 is shown. */
  const autoPrepareLoyalty = useCallback(() => {
    if (!loyaltyJoinUrl && !preparingLoyalty && !loyaltyError) void prepareLoyaltyJoin();
  }, [loyaltyJoinUrl, preparingLoyalty, loyaltyError, prepareLoyaltyJoin]);

  async function copyLoyaltyLink() {
    if (!loyaltyJoinUrl) return;
    try {
      await navigator.clipboard.writeText(loyaltyJoinUrl);
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
  }

  function handleGooglePlaceSelect(patch: Partial<RestaurantInput>) {
    if (!currentRestaurantId) return;
    setGooglePlaceLinked(Boolean(patch.googlePlaceId));
    void updateRestaurantAction(currentRestaurantId, patch);
    posthog.capture("onboarding_optional_action", { action: "google_linked" });
    toast.success(t.googleLinked);
  }

  async function sendInviteIfFilled(): Promise<void> {
    const email = inviteEmail.trim();
    if (!email || !currentRestaurantId) return;
    setInviting(true);
    try {
      const result = await sendTeamInviteAction(currentRestaurantId, email);
      if (result.ok) {
        setInviteSent(true);
        posthog.capture("onboarding_optional_action", { action: "team_invited" });
      }
    } catch {
      // best-effort: onboarding still finishes
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
      if (!finished) throw new Error(t.errFinish);
      try {
        window.localStorage.setItem(DONE_AT_KEY, String(Date.now()));
      } catch {
        // storage can be unavailable (private mode): the 30-minute prompt just won't show
      }
      posthog.capture("onboarding_finished", { offer_variant: variant, goals });
      setDone(true);
      setSubmitting(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.errGeneric);
      setSubmitting(false);
    }
  }

  function onOfferShown() {
    if (offerViewedRef.current) return;
    offerViewedRef.current = true;
    posthog.capture("onboarding_offer_viewed", { offer_variant: variant, variant_source: variantSource });
  }

  function onOfferAccepted() {
    posthog.capture("onboarding_offer_accepted", { offer_variant: variant, variant_source: variantSource });
  }

  if (done) {
    const base = locale === "fr" ? "" : `/${locale}`;
    const displayName = restaurantNameInput.trim() || (lang === "en" ? "Your venue" : "Votre établissement");
    return (
      <div className="flex flex-col gap-5" role="status" aria-live="polite">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mv-green-dark">{t.doneEyebrow}</p>
          <h2 className="mt-1 font-display text-[30px] font-medium leading-tight text-mv-ink">{t.doneTitle(displayName)}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">{t.doneBody}</p>
        </div>
        {loyaltyQrDataUrl && (
          <div className="flex items-center gap-4 rounded-2xl border border-mv-green/20 bg-mv-green/[0.05] p-4">
            <Image src={loyaltyQrDataUrl} alt="QR" width={96} height={96} unoptimized className="rounded-lg bg-white p-1.5" />
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">{t.s3Scan}</p>
          </div>
        )}
        <ol className="flex flex-col gap-2 text-[14px] text-mv-ink">
          {t.doneSteps.map((text, index) => (
            <li key={text} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mv-green text-[12px] font-bold text-white">{index + 1}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <a
          href={`${base}/menu`}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-mv-green px-4 text-[14px] font-semibold text-mv-cream-soft hover:bg-mv-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green"
        >
          {menuImportedCount !== null ? t.doneMenu : t.doneAddMenu}
        </a>
        <a
          href={`${base}/overview`}
          className="inline-flex min-h-12 items-center justify-center rounded-lg text-[14px] font-medium text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green"
        >
          {t.doneDashboard}
        </a>
        <a className="text-center text-[13px] font-medium text-mv-green-dark underline underline-offset-4" href={`${base}/app`}>{t.doneApp}</a>
        <p className="text-center text-[14px] text-mv-ink-soft">
          {t.help}{" "}
          <a className="font-medium text-mv-green-dark underline underline-offset-4" href="mailto:support@minervaflow.app?subject=Aide%20pour%20ma%20configuration">{t.helpLink}</a>
          {t.helpTail}
        </p>
      </div>
    );
  }

  const offer = t.s4Variants[variant];

  return (
    <Onboarding
      defaultValue={1}
      totalSteps={TOTAL_STEPS}
      onComplete={handleFinish}
      canGoNext={(step) => {
        if (step === 1) return firstName.trim().length > 0 && restaurantNameInput.trim().length > 0;
        if (step === 2) return goals.length > 0;
        return true;
      }}
      className="border-none bg-transparent p-0 shadow-none"
    >
      <ProgressHeader lang={lang} />
      <StepEnter step={3} onEnter={autoPrepareLoyalty} />
      <StepEnter step={4} onEnter={onOfferShown} />

      {/* 1 — Welcome (mandatory) */}
      <Onboarding.Step step={1}>
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink">{t.s1Title}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">{t.s1Body}</p>
          </div>
          <Field label={t.yourName}>
            <Input className="h-12 text-[16px]" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="given-name" required />
          </Field>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-mv-ink-soft">{t.kind}</p>
            <div className="grid grid-cols-2 gap-3">
              {(["restaurant", "cafe"] as const).map((value) => (
                <Tile key={value} selected={serviceModel === value} onClick={() => setServiceModel(value)}>
                  {value === "restaurant" ? t.restaurant : t.cafe}
                </Tile>
              ))}
            </div>
          </div>
          <Field label={t.nameOf(establishmentWord)}>
            <Input
              className="h-12 text-[16px]"
              value={restaurantNameInput}
              onChange={(e) => setRestaurantNameInput(e.target.value)}
              placeholder={serviceModel === "cafe" ? t.namePlaceholderC : t.namePlaceholderR}
              required
            />
          </Field>
          {submitError && <p className="text-[14px] text-mv-red">{submitError}</p>}
        </div>
      </Onboarding.Step>

      {/* 2 — Qualification (mandatory, one tap each) */}
      <Onboarding.Step step={2}>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-display text-[24px] font-medium text-mv-ink">{t.s2Title}</h2>
            <p className="mt-1 text-[14px] text-mv-ink-soft">{t.s2Body}</p>
          </div>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-mv-ink-soft">{t.goalsLabel}</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GOALS.map((goal) => (
                <Tile key={goal} selected={goals.includes(goal)} onClick={() => toggleGoal(goal)}>{t.goals[goal]}</Tile>
              ))}
            </div>
            {goals.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 rounded-xl bg-mv-green/[0.07] p-3 text-[13px] leading-snug text-mv-green-dark">
                {goals.map((goal) => (
                  <li key={goal} className="flex gap-2"><Sparkles size={14} className="mt-0.5 shrink-0" />{t.goalPlan[goal]}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-mv-ink-soft">{t.sizeLabel}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SIZES.map((size) => (
                <Tile key={size} selected={sizeBand === size} onClick={() => setSizeBand(size)}>{t.sizes[size]}</Tile>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-mv-ink-soft">{t.posLabel}</p>
            <div className="flex flex-wrap gap-2">
              {POS.map((pos) => (
                <Tile key={pos} compact selected={posSystem === pos} onClick={() => setPosSystem(pos)}>{t.pos[pos]}</Tile>
              ))}
            </div>
          </div>
        </div>
      </Onboarding.Step>

      {/* 3 — Wow: the program exists, with a card and a real QR */}
      <Onboarding.Step step={3}>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-display text-[24px] font-medium text-mv-ink">{t.s3Title}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-mv-ink-soft">{t.s3Body}</p>
          </div>

          <div className="mx-auto w-full max-w-[300px] rounded-[28px] border-[6px] border-mv-ink/90 bg-mv-cream-soft p-4 shadow-lg">
            <p className="text-center font-display text-[18px] font-semibold text-mv-ink">{restaurantNameInput.trim() || "…"}</p>
            <div className="mt-3 rounded-2xl bg-mv-green-dark p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">{t.s3Card}</p>
              <p className="mt-1 font-display text-[28px] leading-none">0 pts</p>
              <p className="mt-2 text-[12px] text-white/80">{t.s3Rate(pointsPerDollar || "1")}</p>
            </div>
            <div className="mt-3 flex flex-col items-center gap-2">
              {loyaltyQrDataUrl ? (
                <Image src={loyaltyQrDataUrl} alt="QR" width={150} height={150} unoptimized className="rounded-lg bg-white p-2" />
              ) : loyaltyError ? (
                <div className="flex h-[150px] flex-col items-center justify-center gap-2 text-center text-[12px] text-mv-ink-soft">
                  <span>{loyaltyError}</span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void prepareLoyaltyJoin()}>{t.s3Retry}</Button>
                </div>
              ) : (
                <div className="flex h-[150px] items-center justify-center gap-2 text-[12px] text-mv-ink-soft"><Loader2 size={16} className="animate-spin" /> {t.s3Preparing}</div>
              )}
              <p className="text-center text-[11px] text-mv-ink-faint">{t.s3Scan}</p>
            </div>
          </div>

          {loyaltyJoinUrl && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={copyLoyaltyLink}><Copy size={13} /> {copiedLoyalty ? t.s3Copied : t.s3Copy}</Button>
              <a href={loyaltyJoinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg px-3 text-[13px] font-semibold text-mv-green-dark underline underline-offset-4">{t.s3Test}</a>
            </div>
          )}
          <details className="group rounded-xl border border-mv-border bg-mv-cream-soft">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[13px] font-medium text-mv-ink-soft">{t.s3Adjust}<span className="font-semibold text-mv-ink">{pointsPerDollar || "1"}</span></summary>
            <div className="flex items-end gap-2 border-t border-mv-border p-3">
              <Input className="h-11 flex-1 text-[16px]" type="number" inputMode="decimal" min="0.1" max="10" step="0.1" value={pointsPerDollar} onChange={(event) => setPointsPerDollar(event.target.value)} />
              <Button type="button" variant="secondary" className="h-11" onClick={() => void prepareLoyaltyJoin()} loading={preparingLoyalty}>OK</Button>
            </div>
          </details>
          <p className="text-center text-[11.5px] text-mv-ink-faint">{t.s3Note}</p>
        </div>
      </Onboarding.Step>

      {/* 4 — Why us + the offer (A/B on the wording only) */}
      <Onboarding.Step step={4}>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mv-green-dark">{t.s4Eyebrow}</p>
            <h2 className="mt-1 font-display text-[26px] font-medium leading-tight text-mv-ink">{offer.headline}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">{offer.sub}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface">
            <p className="border-b border-mv-border px-4 py-2.5 text-[13px] font-semibold text-mv-ink">{t.compareHeading}</p>
            <div className="grid grid-cols-2 gap-px bg-mv-border text-[12.5px]">
              <p className="bg-mv-cream-soft px-3 py-2 font-semibold text-mv-ink-soft">{t.compareLeft}</p>
              <p className="bg-mv-green/[0.08] px-3 py-2 font-semibold text-mv-green-dark">{t.compareRight}</p>
              {t.compareRows.map(([left, right]) => (
                <div key={left} className="contents">
                  <p className="flex gap-1.5 bg-mv-surface px-3 py-2.5 text-mv-ink-soft"><X size={13} className="mt-0.5 shrink-0 text-mv-ink-faint" />{left}</p>
                  <p className="flex gap-1.5 bg-mv-surface px-3 py-2.5 text-mv-ink"><Check size={13} className="mt-0.5 shrink-0 text-mv-green-dark" />{right}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-mv-green/25 bg-mv-green/[0.05] p-4">
            <p className="mb-2 text-[13px] font-semibold text-mv-ink">{t.stackHeading}</p>
            <ul className="flex flex-col gap-1.5">
              {t.stack.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-snug text-mv-ink"><Check size={14} className="mt-0.5 shrink-0 text-mv-green-dark" />{item}</li>
              ))}
            </ul>
          </div>
          <p className="rounded-xl bg-mv-ink/[0.04] p-3 text-[13px] font-medium leading-snug text-mv-ink">{t.guarantee}</p>
          <p className="text-[11.5px] leading-relaxed text-mv-ink-faint">{t.scarcity}</p>
        </div>
      </Onboarding.Step>

      {/* 5 — Launch (all optional) */}
      <Onboarding.Step step={5}>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-[24px] font-medium text-mv-ink">{t.s5Title}</h2>
            <p className="mt-1 text-[14px] text-mv-ink-soft">{t.s5Body}</p>
          </div>

          {currentRestaurantId && (
            <button
              type="button"
              onClick={() => setMenuImportOpen(true)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-mv-border bg-mv-surface px-4 py-3 text-left transition-colors hover:bg-mv-cream-soft focus-visible:outline-2 focus-visible:outline-mv-green"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={20} className="shrink-0 text-mv-green-dark" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-mv-ink">{t.s5Menu} <Optional label={t.optional} /></p>
                  <p className="text-[12px] text-mv-ink-soft">{menuImportedCount !== null ? t.s5MenuDone(menuImportedCount) : t.s5MenuHint}</p>
                </div>
              </div>
              {menuImportedCount !== null && <Check size={16} className="shrink-0 text-mv-green-dark" />}
            </button>
          )}

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-mv-ink"><MapPin size={18} className="text-mv-green-dark" /> {t.s5Google} <Optional label={t.optional} /></p>
            <p className="mt-1 text-[12px] text-mv-ink-soft">{t.s5GoogleHint}</p>
            {googlePlaceLinked && <p className="mt-2 text-[12px] font-semibold text-mv-green-dark">{t.s5GoogleDone}</p>}
            <div className="mt-3 min-w-0"><GooglePlacesSearch enabled={googlePlacesEnabled} onSelect={handleGooglePlaceSelect} /></div>
          </div>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-mv-ink"><Users size={18} className="text-mv-green-dark" /> {t.s5Team} <Optional label={t.optional} /></p>
            {inviteSent ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-mv-green-dark"><Check size={15} /> {t.s5TeamSent(inviteEmail.trim())}</p>
            ) : (
              <div className="mt-2">
                <p className="mb-2 text-[12px] text-mv-ink-soft">{t.s5TeamHint}</p>
                <Input className="h-12 text-[16px]" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t.s5TeamPlaceholder} />
              </div>
            )}
          </div>
          {submitError && <p className="text-[14px] text-mv-red">{submitError}</p>}
        </div>

        {currentRestaurantId && (
          <ImportMenuPdfModal
            restaurantId={currentRestaurantId}
            open={menuImportOpen}
            onClose={() => setMenuImportOpen(false)}
            onImported={(items) => {
              setMenuImportedCount(items.length);
              posthog.capture("onboarding_optional_action", { action: "menu_imported", count: items.length });
            }}
          />
        )}
      </Onboarding.Step>

      <WizardFooter
        lang={lang}
        submitting={submitting}
        inviting={inviting}
        offerCta={offer.cta}
        preparingLoyalty={preparingLoyalty}
        onStepOneContinue={async () => {
          const error = await saveCoreStep();
          setSubmitError(error);
          return error;
        }}
        onStepTwoContinue={saveQualification}
        onOfferAccepted={onOfferAccepted}
      />
    </Onboarding>
  );
}

function Tile({ selected, onClick, children, compact }: { selected: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${compact ? "min-h-10 px-4 text-[13px]" : "min-h-12 px-4 text-[14px]"} rounded-xl border text-left font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green ${
        selected ? "border-mv-green bg-mv-green/[0.09] text-mv-green-dark" : "border-mv-border bg-mv-surface text-mv-ink hover:bg-mv-cream-soft"
      }`}
    >
      <span className="flex items-center gap-2">{selected && <Check size={14} className="shrink-0" />}{children}</span>
    </button>
  );
}

function Optional({ label }: { label: string }) {
  return <span className="ml-1 rounded-full bg-mv-ink/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-mv-ink-soft">{label}</span>;
}

/** Fires `onEnter` each time the wizard lands on `step`. */
function StepEnter({ step, onEnter }: { step: number; onEnter: () => void }) {
  const { currentStep } = useOnboarding();
  useEffect(() => {
    if (currentStep === step) onEnter();
  }, [currentStep, step, onEnter]);
  return null;
}

/** Progress shown to the user, plus one analytics event per step reached (where owners drop off). */
function ProgressHeader({ lang }: { lang: Lang }) {
  const { currentStep, totalSteps } = useOnboarding();
  const minutesLeft = Math.max(1, totalSteps - currentStep + 1);

  useEffect(() => {
    posthog.capture("onboarding_step_viewed", {
      step: currentStep,
      total_steps: totalSteps,
      step_name: STEP_NAMES[currentStep] ?? `step_${currentStep}`,
    });
  }, [currentStep, totalSteps]);

  return (
    <div className="mb-6 flex items-center gap-3">
      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} variant="pills" className="max-w-[120px] flex-1 justify-start" />
      <span className="font-mono text-[11.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">{TXT[lang].stepOf(currentStep, minutesLeft)}</span>
    </div>
  );
}

function WizardFooter({
  lang,
  submitting,
  inviting,
  offerCta,
  preparingLoyalty,
  onStepOneContinue,
  onStepTwoContinue,
  onOfferAccepted,
}: {
  lang: Lang;
  submitting: boolean;
  inviting: boolean;
  offerCta: string;
  preparingLoyalty: boolean;
  onStepOneContinue: () => Promise<string | null>;
  onStepTwoContinue: () => Promise<void>;
  onOfferAccepted: () => void;
}) {
  const t = TXT[lang];
  const { currentStep, totalSteps, canGoBack, canGoNext, handleBack, setStep, handleComplete } = useOnboarding();
  const [pending, setPending] = useState(false);
  const isLastStep = currentStep === totalSteps;

  async function advanceFrom(step: number) {
    setPending(true);
    try {
      if (step === 1) {
        const error = await onStepOneContinue();
        if (error) {
          setPending(false);
          return;
        }
      } else if (step === 2) {
        await onStepTwoContinue();
      } else if (step === 4) {
        onOfferAccepted();
      }
      setStep(step + 1);
    } catch (error) {
      console.error("Onboarding step failed", error);
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset className="mt-6 flex flex-col gap-2.5">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className={canGoBack ? "h-12 flex-1 text-[14px]" : "hidden"}
          disabled={!canGoBack || submitting || pending}
          onClick={handleBack}
        >
          {t.back}
        </Button>

        {isLastStep ? (
          <Button type="button" className="h-12 flex-[2] text-[14px]" disabled={submitting} onClick={handleComplete}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitting ? t.oneMoment : inviting ? t.sending : t.finish}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 flex-[2] text-[14px]"
            disabled={!canGoNext || pending || (currentStep === 3 && preparingLoyalty)}
            onClick={() => void advanceFrom(currentStep)}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : null}
            {pending ? t.oneMoment : currentStep === 4 ? offerCta : t.continue}
          </Button>
        )}
      </div>

      {isLastStep && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="min-h-12 rounded-lg text-center text-[14px] font-medium text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-mv-green"
        >
          {t.finishLater}
        </button>
      )}
    </fieldset>
  );
}
