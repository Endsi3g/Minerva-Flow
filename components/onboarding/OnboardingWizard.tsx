"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, MessagesSquare, FileText, Loader2, Check, Zap, ExternalLink } from "lucide-react";
import {
  Onboarding,
  ChoiceGroup,
  FeatureCarousel,
  TipsList,
  useOnboarding,
} from "@/components/ui/onboarding";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Field, Input } from "@/components/minerva/FormField";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import { roleLabels } from "@/lib/app-context";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { updateProfileNameAction } from "@/app/[locale]/(app)/profil/actions";
import { updateRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import { setMyRoleAction, finishOnboardingAction } from "@/app/[locale]/onboarding/actions";
import type { RestaurantInput } from "@/lib/data/restaurants";
import type { Role } from "@/lib/types";
import { Square, Stripe, GoogleCalendar, Meta, GoogleDrive } from "@/components/ui/BrandIcons";

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
}: {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialRole: Role;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [role, setRole] = useState<Role>(initialRole);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [locationForm, setLocationForm] = useState<Partial<RestaurantInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      // Best-effort, deliberately outside the throw-on-error flow above —
      // nothing entered on this step is required, so a failure here should
      // never block finishing onboarding.
      if (restaurantId && Object.keys(locationForm).length > 0) {
        await updateRestaurantAction(restaurantId, locationForm).catch(() => null);
      }
      const finished = await finishOnboardingAction();
      if (!finished) throw new Error("Impossible de terminer la configuration. Réessayez.");
      // router.refresh() right after push() races the push's own RSC fetch
      // for the destination route and can leave the transition hanging
      // indefinitely (observed in dev mode after several sequential awaited
      // Server Actions) — push() already fetches fresh data for /overview,
      // which hasn't been visited yet this session, so refresh() is redundant.
      router.push("/overview");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Onboarding
      totalSteps={5}
      maxStepValue={FEATURES.length - 1}
      onComplete={handleComplete}
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
          {restaurantId ? (
            <>
              <GooglePlacesSearch onSelect={(patch) => setLocationForm((f) => ({ ...f, ...patch }))} />
              <Field label="Site web" hint="Pré-remplit aussi la description à l'enregistrement">
                <Input
                  value={locationForm.website ?? ""}
                  onChange={(e) => setLocationForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="Ex : monrestaurant.com"
                />
              </Field>
            </>
          ) : (
            <p className="text-[13px] text-mv-ink-soft">
              Vous pourrez importer ces informations plus tard depuis Réglages → Établissement.
            </p>
          )}
        </div>
      </Onboarding.Step>

      <Onboarding.Step step={4}>
        <Onboarding.Header
          title="Connectez vos outils"
          description="Synchronisez vos comptes clés pour centraliser toutes vos données d'exploitation."
        />
        <ConnectToolsStep />
      </Onboarding.Step>

      <Onboarding.Step step={5}>
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

// Controlled by the Onboarding root's stepValue/setStepValue so the tab
// row, the panel below, the step dots, and the Back/Next buttons all agree
// on which feature is showing (an uncontrolled FeatureCarousel would keep
// its own index and drift out of sync with Navigation's Next button).
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

function ConnectToolsStep() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const tools = [
    {
      id: "square",
      name: "Square POS",
      desc: "Synchronisation des ventes & caisse",
      icon: Square,
      href: "/api/oauth/square",
      color: "bg-black text-white",
    },
    {
      id: "stripe",
      name: "Stripe",
      desc: "Gestion des paiements & factures",
      icon: Stripe,
      href: "/api/stripe/webhook",
      color: "bg-[#635BFF] text-white",
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      desc: "Réservations & plannings d'équipe",
      icon: GoogleCalendar,
      href: "/api/oauth/google-calendar",
      color: "bg-[#4285F4] text-white",
    },
    {
      id: "meta",
      name: "Meta (FB & IG)",
      desc: "Avis clients & réseaux sociaux",
      icon: Meta,
      href: "/api/oauth/meta",
      color: "bg-[#0668E1] text-white",
    },
    {
      id: "workspace",
      name: "Google Workspace",
      desc: "Documents & fichiers d'exploitation",
      icon: GoogleDrive,
      href: "/api/oauth/google-workspace",
      color: "bg-[#0F9D58] text-white",
    },
  ];

  function toggleConnect(id: string, href: string) {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
    if (href.startsWith("/api/oauth")) {
      window.open(href, "_blank", "width=600,height=700");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Visual Orbit Container */}
      <div className="relative mx-auto flex h-36 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-mv-border bg-mv-ink/95 p-4 shadow-mv-sm">
        {/* Glow behind orbit */}
        <div className="absolute h-24 w-24 rounded-full bg-mv-green/20 blur-xl" />

        {/* Outer Orbit Circle */}
        <div className="absolute h-28 w-28 rounded-full border border-dashed border-white/20" />

        {/* Center Badge */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-mv-green p-3 shadow-lg shadow-mv-green/30 ring-4 ring-white/10">
          <Zap size={22} className="text-mv-cream-soft" />
        </div>

        {/* Orbiting Icons */}
        <div className="absolute left-6 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow">
          <Square size={14} />
        </div>
        <div className="absolute right-6 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow">
          <Stripe size={14} />
        </div>
        <div className="absolute left-10 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow">
          <GoogleCalendar size={14} />
        </div>
        <div className="absolute right-10 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow">
          <Meta size={14} />
        </div>
      </div>

      {/* Mini Cards Grid */}
      <div className="space-y-2">
        {tools.map((t) => {
          const Icon = t.icon;
          const isConnected = Boolean(connected[t.id]);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-mv-border bg-mv-surface p-3 shadow-mv-sm transition-all hover:bg-mv-cream-soft"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-mv-ink truncate">{t.name}</p>
                  <p className="text-[11px] text-mv-ink-soft truncate">{t.desc}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleConnect(t.id, t.href)}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  isConnected
                    ? "bg-mv-green-tint text-mv-green-dark border border-mv-green/30"
                    : "bg-mv-ink text-white hover:bg-mv-ink/80"
                }`}
              >
                {isConnected ? (
                  <>
                    <Check size={13} />
                    Connected
                  </>
                ) : (
                  <>
                    Connecter
                    <ExternalLink size={11} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

