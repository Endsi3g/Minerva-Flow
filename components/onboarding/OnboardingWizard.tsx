"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, MessagesSquare, FileText, Loader2, Zap, ExternalLink } from "lucide-react";
import {
  Onboarding,
  ChoiceGroup,
  FeatureCarousel,
  TipsList,
  useOnboarding,
} from "@/components/ui/onboarding";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Field, Input } from "@/components/minerva/FormField";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import { roleLabels } from "@/lib/app-context";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { updateProfileNameAction } from "@/app/[locale]/(app)/profil/actions";
import { updateRestaurantAction, createRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import { updateBreakEvenSettingsAction } from "@/app/[locale]/(app)/finance/actions";
import {
  setMyRoleAction,
  finishOnboardingAction,
  getConnectedToolsStatusAction,
  type ConnectedToolsStatus,
} from "@/app/[locale]/onboarding/actions";
import { BREAK_EVEN_DEFAULTS, CAFE_BREAK_EVEN_DEFAULTS } from "@/lib/engine/break-even";
import type { RestaurantInput } from "@/lib/data/restaurants";
import type { Role } from "@/lib/types";
import { Square, Stripe, GoogleCalendar, Meta, GoogleDrive } from "@/components/ui/BrandIcons";
import { Button, Badge } from "@/components/ui";

const FEATURES = [
  {
    icon: BarChart3,
    label: "Vue d'ensemble",
    title: "Suivez vos revenus en un coup d'œil",
    description:
      "Revenu, marge, anomalies : votre tableau de bord se met à jour à mesure que vous ajoutez vos journées de service.",
  },
  {
    icon: MessagesSquare,
    label: "Chat IA",
    title: "Posez vos questions à l'assistant",
    description:
      "Demandez une comparaison, une prévision ou un rapport en langage courant — l'assistant construit le graphique pour vous.",
  },
  {
    icon: FileText,
    label: "Rapports",
    title: "Rapports automatisés chaque semaine",
    description:
      "Recevez un résumé de la performance de votre établissement directement dans l'application, et par courriel si vous le souhaitez.",
  },
];

const ROLE_OPTIONS: Role[] = ["owner", "manager", "staff", "consultant"];

export function OnboardingWizard({
  userId,
  restaurantId,
  restaurantName,
  initialFullName,
  initialAvatarUrl,
  initialRole,
  initialStep = 1,
}: {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialRole: Role;
  initialStep?: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [role, setRole] = useState<Role>(initialRole);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [locationForm, setLocationForm] = useState<Partial<RestaurantInput>>({});
  const [serviceModel, setServiceModel] = useState<"restaurant" | "cafe" | "hybrid">("restaurant");
  const [avgBasket, setAvgBasket] = useState(BREAK_EVEN_DEFAULTS.avgBasket);
  const [fixedCosts, setFixedCosts] = useState(BREAK_EVEN_DEFAULTS.fixedCosts);
  const [grossMarginPct, setGrossMarginPct] = useState(BREAK_EVEN_DEFAULTS.grossMarginPct);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Switching the establishment type suggests café-calibrated numbers
  // instead of the generic restaurant defaults — still freely editable,
  // just a better starting point than a one-size-fits-all guess.
  function handleServiceModelChange(next: "restaurant" | "cafe" | "hybrid") {
    setServiceModel(next);
    const defaults = next === "cafe" ? CAFE_BREAK_EVEN_DEFAULTS : BREAK_EVEN_DEFAULTS;
    setAvgBasket(defaults.avgBasket);
    setFixedCosts(defaults.fixedCosts);
    setGrossMarginPct(defaults.grossMarginPct);
  }

  const { preview, loading: uploadLoading, error: uploadError, pickAndUpload } = useAvatarUpload({
    userId,
    onUploaded: (url) => setAvatarUrl(url),
  });

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const trimmed = fullName.trim();
      if (trimmed && trimmed !== initialFullName) {
        const result = await updateProfileNameAction(trimmed);
        if (!result.ok) throw new Error(result.error);
      }
      await setMyRoleAction(restaurantId, role);

      // Create or Update Restaurant details entered during onboarding steps 3-4
      const restaurantPatch = { ...locationForm, serviceModel };
      let resolvedRestaurantId = restaurantId || null;
      if (restaurantId) {
        await updateRestaurantAction(restaurantId, restaurantPatch).catch(() => null);
      } else {
        const created = await createRestaurantAction({
          name: restaurantPatch.name || "Mon restaurant",
          ...restaurantPatch,
        }).catch(() => null);
        resolvedRestaurantId = created?.id ?? null;
      }

      // Break-even assumptions live outside RestaurantInput (see
      // updateBreakEvenSettings) — this is what makes Overview's "Objectif
      // du jour" reflect this client's real numbers from day one instead
      // of the generic BREAK_EVEN_DEFAULTS fallback. Passed explicitly
      // (not via the "current restaurant" cookie) since a restaurant just
      // created above isn't guaranteed to be reflected in that cookie yet.
      if (resolvedRestaurantId) {
        await updateBreakEvenSettingsAction({ fixedCosts, grossMarginPct, avgBasket }, resolvedRestaurantId).catch(
          () => null
        );
      }

      const finished = await finishOnboardingAction();
      if (!finished) throw new Error("Impossible de terminer la configuration. Réessayez.");
      router.push("/overview");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Onboarding
      defaultValue={initialStep}
      totalSteps={6}
      maxStepValue={FEATURES.length - 1}
      onComplete={handleComplete}
      onValueChange={(step) => {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `?step=${step}`);
        }
      }}
      canGoNext={(step) => step !== 2 || fullName.trim().length > 0}
      className="w-full max-w-lg mx-auto"
    >
      <Onboarding.StepIndicator className="mb-5" />

      <Onboarding.Step step={1}>
        <Onboarding.Header
          title="Bienvenue sur Flow par Minerva"
          description="Voici un aperçu de ce que vous pourrez faire."
        />
        <FeatureStep />
      </Onboarding.Step>

      <Onboarding.Step step={2}>
        <Onboarding.Header title="Faites connaissance" description={`Personnalisez votre profil chez ${restaurantName}.`} />
        <div className="mt-5 flex flex-col items-center gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mv-green/40"
              aria-label="Changer la photo de profil"
            >
              <Avatar name={fullName || "?"} src={preview ?? avatarUrl} size={76} />
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

          <div className="w-full">
            <Field label="Votre nom">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Tremblay"
                required
              />
            </Field>
          </div>

          <div className="w-full">
            <p className="mb-2 text-[13px] font-semibold text-mv-ink-soft">Votre rôle</p>
            <ChoiceGroup name="role" value={role} onValueChange={(v) => setRole(v as Role)} orientation="grid">
              {ROLE_OPTIONS.map((r) => (
                <ChoiceGroup.Item key={r} value={r}>
                  {roleLabels[r]}
                </ChoiceGroup.Item>
              ))}
            </ChoiceGroup>
          </div>
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={3}>
        <Onboarding.Header
          title="Trouvez votre établissement"
          description="Importez automatiquement l'adresse et les horaires — ou passez cette étape."
        />
        <div className="mt-5 space-y-4">
          <GooglePlacesSearch onSelect={(patch) => setLocationForm((f) => ({ ...f, ...patch }))} />
          <Field label="Site web" hint="Pré-remplit aussi la description à l'enregistrement">
            <Input
              value={locationForm.website ?? ""}
              onChange={(e) => setLocationForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="Ex : monrestaurant.com"
            />
          </Field>
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={4}>
        <Onboarding.Header
          title="Vos chiffres clés"
          description="Ces trois nombres calculent votre objectif de clients chaque jour dans Aperçu — modifiables en tout temps depuis Finance."
        />
        <div className="mt-5 space-y-4">
          <Field label="Type d'établissement">
            <Select value={serviceModel} onValueChange={(v) => handleServiceModelChange(v as "restaurant" | "cafe" | "hybrid")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un type">
                  {(v: string | null) =>
                    v === "cafe" ? "Café" : v === "hybrid" ? "Hybride (café-resto)" : "Restaurant"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="cafe">Café</SelectItem>
                <SelectItem value="hybrid">Hybride (café-resto)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Panier moyen par client ($)">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={avgBasket}
                onChange={(e) => setAvgBasket(Number(e.target.value))}
              />
            </Field>
            <Field label="Marge brute (%)" hint="100% moins votre food cost">
              <Input
                type="number"
                min="0"
                max="100"
                value={grossMarginPct}
                onChange={(e) => setGrossMarginPct(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Coûts fixes mensuels ($)" hint="Loyer, salaires de base, assurances — avant les ventes">
            <Input
              type="number"
              min="0"
              step="100"
              value={fixedCosts}
              onChange={(e) => setFixedCosts(Number(e.target.value))}
            />
          </Field>
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={5}>
        <Onboarding.Header
          title="Connectez vos outils"
          description="Synchronisez vos comptes clés pour centraliser toutes vos données d'exploitation."
        />
        <ConnectToolsStep restaurantId={restaurantId} />
      </Onboarding.Step>

      <Onboarding.Step step={6}>
        <Onboarding.Header title="Vous êtes prêt !" description="Quelques conseils pour bien démarrer." />
        <div className="mt-5">
          <TipsList title="Conseils">
            <TipsList.Item number={1}>
              Ajoutez votre première journée de service depuis Overview pour voir vos courbes se remplir.
            </TipsList.Item>
            <TipsList.Item number={2}>
              Ouvrez le Chat IA et demandez « Comment s&apos;est passée ma semaine ? » pour un premier résumé.
            </TipsList.Item>
            <TipsList.Item number={3}>
              Invitez votre équipe depuis Réglages → Rôles &amp; équipe quand vous serez prêt.
            </TipsList.Item>
          </TipsList>
        </div>
        {submitError && <p className="mt-3 text-[12.5px] text-mv-red">{submitError}</p>}
      </Onboarding.Step>

      <Onboarding.Navigation
        className="mt-6"
        completeLabel={submitting ? "Un instant…" : "Commencer"}
        canGoNext={submitting ? false : undefined}
      />
    </Onboarding>
  );
}

function FeatureStep() {
  const { stepValue, setStepValue } = useOnboarding();
  const feature = FEATURES[stepValue];
  const Icon = feature.icon;

  return (
    <div className="mt-5">
      <FeatureCarousel value={stepValue} onValueChange={setStepValue} totalItems={FEATURES.length} className="flex gap-2">
        {FEATURES.map((f, i) => {
          const ItemIcon = f.icon;
          return (
            <FeatureCarousel.Item
              key={f.label}
              index={i}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-mv-border px-2 py-2.5 text-[11.5px] font-semibold text-mv-ink-soft transition-colors data-[state=active]:border-mv-green data-[state=active]:bg-mv-green/[0.08] data-[state=active]:text-mv-ink"
            >
              <ItemIcon size={16} />
              {f.label}
            </FeatureCarousel.Item>
          );
        })}
      </FeatureCarousel>
      <div className="mt-4 rounded-xl border border-mv-border bg-mv-cream-soft p-4 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-mv-green/15 text-mv-green-dark">
          <Icon size={18} />
        </div>
        <p className="mt-2.5 font-display text-[15px] font-medium text-mv-ink">{feature.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">{feature.description}</p>
      </div>
    </div>
  );
}

function ConnectToolsStep({ restaurantId }: { restaurantId: string }) {
  const [connected, setConnected] = useState<Partial<ConnectedToolsStatus>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const refreshStatus = useCallback(async () => {
    const status = await getConnectedToolsStatusAction(restaurantId);
    setConnected(status);
  }, [restaurantId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const tools = [
    {
      id: "square" as const,
      name: "Square POS",
      desc: "Synchronisation des ventes & caisse",
      icon: Square,
      href: "/api/oauth/square",
    },
    {
      id: "stripe" as const,
      name: "Stripe",
      desc: "Gestion des paiements & factures",
      icon: Stripe,
      href: "/billing",
    },
    {
      id: "google-calendar" as const,
      name: "Google Calendar",
      desc: "Réservations & plannings d'équipe",
      icon: GoogleCalendar,
      href: "/api/oauth/google-calendar",
    },
    {
      id: "meta" as const,
      name: "Meta (FB & IG)",
      desc: "Avis clients & réseaux sociaux",
      icon: Meta,
      href: "/api/oauth/meta",
    },
    {
      id: "workspace" as const,
      name: "Google Workspace",
      desc: "Documents & fichiers d'exploitation",
      icon: GoogleDrive,
      href: "/api/oauth/google-workspace?feature=drive&feature=sheets",
    },
  ];

  /**
   * Stripe billing setup is deliberately deferred (not part of this onboarding flow) —
   * this just opens the real billing page, never claims a fake "Connecté" state.
   * Every other tool opens a real OAuth popup and, once it closes, re-checks REAL
   * DB-backed status (never optimistic client state — a blocked/cancelled/failed
   * popup must not show as connected).
   */
  function connect(id: (typeof tools)[number]["id"], href: string) {
    if (id === "stripe") {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setPending((p) => ({ ...p, [id]: true }));
    const popup = window.open(href, `oauth_${id}`, "width=600,height=720");
    if (!popup) {
      setPending((p) => ({ ...p, [id]: false }));
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setPending((p) => ({ ...p, [id]: false }));
        void refreshStatus();
      }
    }, 800);
  }

  return (
    <div className="mt-4 space-y-4">
      {/* High-Contrast Visual Orbit Container */}
      <div className="relative mx-auto flex h-36 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-mv-border bg-[#0a1e14] p-4 shadow-mv-sm">
        {/* Ambient Glow */}
        <div className="absolute h-24 w-24 rounded-full bg-emerald-500/20 blur-xl" />

        {/* Orbit Circle Ring */}
        <div className="absolute h-28 w-28 rounded-full border border-dashed border-white/25" />

        {/* Center Minerva Pulse Badge */}
        <div className="relative z-10 flex h-13 w-13 items-center justify-center rounded-full bg-mv-green p-3 shadow-lg shadow-mv-green/40 ring-4 ring-white/20">
          <Zap size={22} className="text-white" />
        </div>

        {/* Orbiting White High-Contrast Badges with Official Tool Icons */}
        <div className="absolute left-5 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-mv-ink">
          <Square size={18} />
        </div>
        <div className="absolute right-5 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-mv-ink">
          <Stripe size={18} />
        </div>
        <div className="absolute left-9 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-mv-ink">
          <GoogleCalendar size={18} />
        </div>
        <div className="absolute right-9 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-mv-ink">
          <Meta size={18} />
        </div>
      </div>

      {/* High-Contrast Crisp Mini Cards List */}
      <div className="space-y-2.5">
        {tools.map((t) => {
          const Icon = t.icon;
          const isStripe = t.id === "stripe";
          const isConnected = !isStripe && Boolean(connected[t.id]);
          const isPending = Boolean(pending[t.id]);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-mv-border bg-white p-3 shadow-mv-sm transition-all hover:border-mv-green/40"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8f9fa] border border-mv-border shadow-mv-sm text-mv-ink">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-mv-ink truncate">{t.name}</p>
                  <p className="text-[11px] text-mv-ink-soft truncate">{t.desc}</p>
                </div>
              </div>

              {isConnected ? (
                <Badge tone="green" dot size="sm" className="shrink-0">
                  Connecté
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant={isStripe ? "secondary" : "default"}
                  size="sm"
                  loading={isPending}
                  onClick={() => connect(t.id, t.href)}
                  className="shrink-0"
                >
                  {isPending ? "Connexion…" : isStripe ? "Configurer" : "Connecter"}
                  {!isPending && <ExternalLink size={11} />}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
