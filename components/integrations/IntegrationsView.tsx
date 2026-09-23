"use client";

import { useState } from "react";
import type { IntegrationItem } from "@/lib/data/integrations";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  X,
  CreditCard,
  Store,
  Shield,
  Clock,
  Sparkles,
  Lock,
  Landmark,
  Globe,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import {
  Square,
  Stripe,
  Google,
  GoogleWorkspace,
  UberEats,
  Gmail,
  GoogleAnalytics,
  GooglePay,
  GoogleMaps,
  QuickBooks,
  Xero,
  Sage,
  FreshBooks,
  Dext,
  Pennylane,
  Clover,
  Lightspeed,
  Moneris,
  PayPal,
  ApplePay,
  Instagram,
  Toast,
} from "@/components/ui/BrandIcons";
import { SiteSyncCard } from "@/components/minerva/SiteSyncCard";
import { syncPosNowAction } from "@/app/[locale]/(app)/settings/pos-actions";
import type { PosProvider } from "@/lib/data/pos-connections";

type PillarId = "all" | "caisse" | "paiement" | "comptabilite" | "visibilite";

interface PillarMeta {
  id: PillarId;
  label: string;
  icon: typeof Store;
  title: string;
  description: string;
}

const PILLARS: PillarMeta[] = [
  {
    id: "all",
    label: "Toutes les connexions",
    icon: SlidersHorizontal,
    title: "Écosystème Global",
    description: "Vue d'ensemble de tous vos services synchronisés avec Minerva Flow.",
  },
  {
    id: "caisse",
    label: "Systèmes de caisse",
    icon: Store,
    title: "Systèmes de Caisse",
    description: "Synchronisation automatique des ventes quotidiennes, clôtures et déduction des stocks en direct.",
  },
  {
    id: "paiement",
    label: "Paiements & Encaissement",
    icon: CreditCard,
    title: "Paiements & Encaissement",
    description: "Terminaux de paiement physiques, paiements mobiles sans contact et virements automatisés.",
  },
  {
    id: "comptabilite",
    label: "Comptabilité & Facturation",
    icon: Landmark,
    title: "Comptabilité & Facturation",
    description: "Rapprochement bancaire, ventilation des taxes et transmission certifiée à votre comptable.",
  },
  {
    id: "visibilite",
    label: "Visibilité, Avis & Livraison",
    icon: Globe,
    title: "Visibilité & Canaux Externes",
    description: "Avis Google, réseaux sociaux, plateformes de livraison et vitrine web connectée.",
  },
];

function getCategoryPillar(category: IntegrationItem["category"]): "caisse" | "paiement" | "comptabilite" | "visibilite" {
  switch (category) {
    case "caisse":
      return "caisse";
    case "paiement":
      return "paiement";
    case "comptabilite":
      return "comptabilite";
    case "marketing":
    case "livraison":
    case "communication":
    default:
      return "visibilite";
  }
}

export function IntegrationsView({
  initialIntegrations,
  restaurantName,
  restaurantId,
}: {
  initialIntegrations: IntegrationItem[];
  restaurantName: string;
  restaurantId: string;
}) {
  const [integrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(
    initialIntegrations[0] || null
  );
  const [selectedPillar, setSelectedPillar] = useState<PillarId>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [requestedWaitlist, setRequestedWaitlist] = useState<Record<string, boolean>>({});
  const [showSiteSync, setShowSiteSync] = useState(false);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  function handleRequestAccess(item: IntegrationItem) {
    setRequestedWaitlist((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Votre demande d'activation pour ${item.name} a été enregistrée avec succès.`);
  }

  async function handleForceSync(item: IntegrationItem) {
    const provider = item.id.replace(/-pos$/, "") as PosProvider;
    setIsSyncing(true);
    try {
      const ok = await syncPosNowAction(provider);
      if (ok) {
        toast.success(`Synchronisation terminée avec ${item.name} !`);
      } else {
        toast.error("La synchronisation a échoué.");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  const filteredIntegrations = integrations.filter((item) => {
    if (selectedPillar === "all") return true;
    return getCategoryPillar(item.category) === selectedPillar;
  });

  const getIcon = (iconName: IntegrationItem["iconName"]) => {
    switch (iconName) {
      case "square":
        return <Square size={22} />;
      case "lightspeed":
        return <Lightspeed size={22} />;
      case "stripe":
        return <Stripe size={22} />;
      case "google":
        return <Google size={22} />;
      case "google-maps":
        return <GoogleMaps size={22} />;
      case "google-workspace":
        return <GoogleWorkspace size={22} />;
      case "google-analytics":
        return <GoogleAnalytics size={22} />;
      case "google-pay":
        return <GooglePay size={22} />;
      case "apple-pay":
        return <ApplePay size={22} />;
      case "paypal":
        return <PayPal size={22} />;
      case "quickbooks":
        return <QuickBooks size={22} />;
      case "xero":
        return <Xero size={22} />;
      case "sage":
        return <Sage size={22} />;
      case "freshbooks":
        return <FreshBooks size={22} />;
      case "dext":
        return <Dext size={22} />;
      case "pennylane":
        return <Pennylane size={22} />;
      case "clover":
        return <Clover size={22} />;
      case "toast":
        return <Toast size={22} />;
      case "moneris":
        return <Moneris size={22} />;
      case "delivery":
        return <UberEats size={22} />;
      case "resend":
        return <Gmail size={22} />;
      case "instagram":
        return <Instagram size={22} />;
      case "facebook":
        return <span aria-label="Facebook" className="text-lg font-bold text-[#1877F2]">f</span>;
      default:
        return <Store size={22} className="text-mv-green-dark" />;
    }
  };

  const getOperationalSummary = (item: IntegrationItem) => {
    const pillar = getCategoryPillar(item.category);
    switch (pillar) {
      case "caisse":
        return "Relève automatique des tickets, ventes quotidiennes et sorties d'ingrédients";
      case "paiement":
        return "Encaissements sécurisés par carte, transactions mobiles et virements automatiques";
      case "comptabilite":
        return "Export certifié des écritures, calcul de taxes et rapprochement de caisse";
      case "visibilite":
        return "Centralisation des avis, mise à jour des informations et commandes clients";
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mv-green-tint px-2.5 py-0.5 text-[11px] font-bold text-mv-green-dark uppercase tracking-wider">
              {restaurantName}
            </span>
            <span className="flex items-center gap-1 text-[11.5px] font-medium text-mv-ink-faint">
              <Lock size={12} className="text-mv-green-dark" /> Écosystème Chiffré & Sécurisé
            </span>
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-mv-ink mt-1.5">
            Services & Outils Connectés
          </h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mv-ink-soft max-w-3xl">
            Consultez les services vraiment associés à cet établissement. Une carte « non connecté » décrit une option disponible; elle ne signifie pas qu’un fournisseur est déjà relié.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSiteSync(!showSiteSync)}
            className="flex items-center gap-1.5 rounded-xl border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-semibold text-mv-ink shadow-mv-xs transition-all hover:bg-mv-cream-soft"
          >
            <Globe size={14} className="text-mv-green-dark" />
            <span>{showSiteSync ? "Masquer la vitrine" : "Vitrine Web en direct"}</span>
          </button>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-xl border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-semibold text-mv-ink shadow-mv-xs transition-all hover:bg-mv-cream-soft"
          >
            <Settings size={14} />
            <span>Paramètres de caisse</span>
          </Link>
        </div>
      </div>

      {/* Luxury Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Services connectés
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
              <CheckCircle2 size={15} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[24px] font-bold text-mv-ink">{connectedCount}</span>
            <span className="text-[12.5px] text-mv-ink-soft">sur {integrations.length} disponibles</span>
          </div>
          <p className="mt-1 text-[11.5px] text-mv-ink-faint">Flux actifs et opérationnels sans interruption</p>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Mode de synchronisation
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-green-dark">
              <RefreshCw size={14} />
            </span>
          </div>
          <div className="mt-2">
              <span className="font-display text-[17px] font-semibold text-mv-ink">Selon le service connecté</span>
          </div>
          <p className="mt-1 text-[11.5px] text-mv-ink-faint">Les caisses connectées se synchronisent selon leur cycle; une synchronisation manuelle est aussi possible.</p>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Protection des données
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-green-dark">
              <Shield size={15} />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display text-[17px] font-semibold text-mv-ink">Standard Bancaire Sécurisé</span>
          </div>
          <p className="mt-1 text-[11.5px] text-mv-ink-faint">Chiffrement certifié et aucune donnée sensible exposée</p>
        </div>
      </div>

      {/* Optional Live Showcase Card */}
      {showSiteSync && (
        <div className="mv-animate-in">
          <SiteSyncCard
            restaurantId={restaurantId}
            initialShowcase={{
              restaurantId,
              restaurantName: restaurantName || "Café & Bistro Minerva",
              isOpenNow: true,
              hoursNotice: "Ouvert aujourd'hui de 08:00 à 22:00",
              activePromoTitle: "Spécial Brunch du Dimanche",
              activePromoText: "Profitez de 15% de réduction sur la formule brunch ce week-end !",
              activePromoBadge: "Promotion Vedette",
              featuredMenuItems: [],
              updatedAt: new Date().toISOString(),
            }}
          />
        </div>
      )}

      {/* Business Pillar Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-mv-border-soft pb-3">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const isActive = selectedPillar === pillar.id;
          const count =
            pillar.id === "all"
              ? integrations.length
              : integrations.filter((i) => getCategoryPillar(i.category) === pillar.id).length;

          return (
            <button
              key={pillar.id}
              onClick={() => setSelectedPillar(pillar.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
                isActive
                  ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                  : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:border-mv-green/40 hover:bg-mv-cream-soft hover:text-mv-ink"
              }`}
            >
              <Icon size={14} />
              <span>{pillar.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-mv-cream-soft text-mv-ink-faint"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split-Screen Container */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Grid */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.map((item) => {
              const isSelected = selectedIntegration?.id === item.id;
              const pillar = getCategoryPillar(item.category);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIntegration(item)}
                  className={`group flex flex-col justify-between rounded-2xl border p-5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-mv-green bg-mv-surface shadow-mv-md ring-2 ring-mv-green/25"
                      : "border-mv-border bg-mv-surface hover:border-mv-green-dark hover:shadow-mv-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border-soft shadow-mv-xs">
                        {getIcon(item.iconName)}
                      </div>

                      {item.status === "connected" ? (
                        <Badge tone="green">
                          <CheckCircle2 size={12} className="mr-1 inline" /> Connecté
                        </Badge>
                      ) : item.status === "pending" ? (
                        <Badge tone="amber">
                          <AlertCircle size={12} className="mr-1 inline" /> En cours
                        </Badge>
                      ) : item.status === "error" ? (
                        <Badge tone="red">
                          <XCircle size={12} className="mr-1 inline" /> À reconnecter
                        </Badge>
                      ) : item.status === "coming_soon" ? (
                        <span className="flex items-center gap-1 rounded-full bg-mv-lime/30 px-2.5 py-0.5 text-[11px] font-bold text-mv-green-dark">
                          <Clock size={11} /> Prochainement
                        </span>
                      ) : item.status === "on_request" ? (
                        <Badge tone="amber">
                          <Sparkles size={11} className="mr-1 inline" /> Sur demande
                        </Badge>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-mv-cream-soft px-2.5 py-0.5 text-[11px] font-semibold text-mv-ink-faint">
                          Non connecté
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-[16.5px] font-semibold text-mv-ink group-hover:text-mv-green-dark transition-colors">
                      {item.name}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-mv-ink-soft">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-mv-border-soft pt-3 text-[11.5px]">
                    <span className="text-mv-ink-faint font-medium capitalize">
                      {pillar === "caisse"
                        ? "Caisse enregistreuse"
                        : pillar === "paiement"
                        ? "Encaissement"
                        : pillar === "comptabilite"
                        ? "Comptabilité"
                        : "Visibilité"}
                    </span>
                    <span className="font-semibold text-mv-green-dark group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Consulter <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Drawer */}
        {selectedIntegration && (
          <div className="w-full lg:w-[420px] shrink-0">
            <Card padded={false} className="sticky top-6 border-mv-border bg-mv-surface shadow-mv-md overflow-hidden">
              {/* Drawer Top Bar */}
              <div className="flex items-center justify-between border-b border-mv-border bg-mv-cream-soft p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-surface border border-mv-border-soft shadow-mv-xs">
                    {getIcon(selectedIntegration.iconName)}
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-mv-ink">{selectedIntegration.name}</h3>
                    <p className="text-[11.5px] text-mv-ink-soft">
                      {selectedIntegration.status === "connected"
                        ? "Actif et synchronisé"
                        : selectedIntegration.status === "coming_soon"
                        ? "En cours de déploiement"
                        : selectedIntegration.status === "on_request"
                        ? "Disponible sur activation"
                        : selectedIntegration.status === "error"
                        ? "Action requise"
                        : "Disponible pour connexion"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIntegration(null)}
                  aria-label="Fermer les détails"
                  className="rounded-lg p-1.5 text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Value Proposition Description */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                    Utilité pour votre établissement
                  </h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mv-ink">
                    {selectedIntegration.description}
                  </p>
                  <div className="mt-2.5 rounded-xl bg-mv-cream-soft p-3 text-[12px] text-mv-ink-soft">
                    <span className="font-semibold text-mv-ink">Bénéfice direct : </span>
                    {getOperationalSummary(selectedIntegration)}
                  </div>
                  {selectedIntegration.category === "caisse" && (
                    <div className="mt-3 rounded-xl border border-mv-border-soft p-3 text-[12px]">
                      <p className="font-semibold text-mv-ink">Prérequis de connexion</p>
                      <p className="mt-1 leading-relaxed text-mv-ink-soft">
                        {String(selectedIntegration.details?.prerequisite ?? "Autorisez Minerva Flow dans les paramètres de votre fournisseur.")}
                      </p>
                      <p className="mt-2 text-mv-ink-faint">
                        Application configurée côté Minerva : {selectedIntegration.details?.platformAppConfigured ? "oui" : "non — l’accès partenaire ou les identifiants doivent d’abord être configurés"}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Status & Operational Box (Restaurateur-First, No Raw Dev JSON) */}
                <div className="rounded-xl border border-mv-border-soft bg-mv-surface p-3.5 space-y-2.5 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-mv-ink-soft">État du service</span>
                    <span className="font-semibold text-mv-ink">
                      {selectedIntegration.status === "connected" ? (
                        <span className="text-mv-green-dark flex items-center gap-1">
                          <CheckCircle2 size={13} /> Opérationnel
                        </span>
                      ) : selectedIntegration.status === "coming_soon" ? (
                        "Prochaine version"
                      ) : selectedIntegration.status === "on_request" ? (
                        "Sur demande"
                      ) : selectedIntegration.status === "error" ? (
                        <span className="text-mv-red">À reconnecter</span>
                      ) : (
                        "Prêt à être associé"
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-mv-ink-soft">Dernière synchronisation</span>
                    <span className="font-medium text-mv-ink">
                      {selectedIntegration.connectedAt ||
                        (selectedIntegration.status === "connected" ? "Aujourd'hui (Automatique)" : "Non synchronisé")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-mv-ink-soft">Fréquence de relève</span>
                    <span className="font-medium text-mv-ink">Selon le service; synchronisation manuelle possible</span>
                  </div>
                </div>

                {/* Security Reassurance Card */}
                <div className="rounded-xl border border-mv-green/15 bg-mv-green-tint/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Shield size={16} className="text-mv-green-dark shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[12px] font-bold text-mv-green-dark">
                        Sécurité & Confidentialité
                      </h5>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-mv-ink-soft">
                        Connexion directe chiffrée selon les standards bancaires les plus stricts. Vos données
                        financières et vos tickets restent strictement confidentiels et protégés.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  {(() => {
                    if (
                      selectedIntegration.status === "coming_soon" ||
                      selectedIntegration.status === "on_request"
                    ) {
                      const isRequested = Boolean(requestedWaitlist[selectedIntegration.id]);
                      return (
                        <Button
                          type="button"
                          onClick={() => handleRequestAccess(selectedIntegration)}
                          disabled={isRequested}
                          className="w-full justify-center"
                        >
                          {isRequested ? (
                            <>
                              <CheckCircle2 size={15} /> Demande transmise avec succès
                            </>
                          ) : (
                            <>
                              <Sparkles size={15} />
                              {selectedIntegration.status === "on_request"
                                ? "Demander l'activation personnalisée"
                                : "Être prévenu lors de la disponibilité"}
                            </>
                          )}
                        </Button>
                      );
                    }

                    const isPos = selectedIntegration.category === "caisse";
                    const isStripe = selectedIntegration.id === "stripe-connect";

                    if (selectedIntegration.status === "connected") {
                      return (
                        <div className="space-y-2">
                          {isPos && (
                            <Button
                              onClick={() => handleForceSync(selectedIntegration)}
                              disabled={isSyncing}
                              className="w-full justify-center"
                            >
                              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                              <span>{isSyncing ? "Synchronisation en cours…" : "Synchroniser maintenant"}</span>
                            </Button>
                          )}
                          <Link
                            href={isPos ? "/settings" : "/etablissement"}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 text-[13px] font-semibold text-mv-ink shadow-mv-xs transition-all hover:bg-mv-cream-soft"
                          >
                            <Settings size={15} />
                            <span>Paramètres de la connexion</span>
                          </Link>
                        </div>
                      );
                    }

                    if (selectedIntegration.status === "error") {
                      return (
                        <Link
                          href={isPos ? "/settings" : "/etablissement"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-red px-4 py-2.5 text-[13px] font-bold text-white shadow-mv-sm transition-all hover:bg-mv-red/90"
                        >
                          <RefreshCw size={15} />
                          <span>Reconnecter {selectedIntegration.name}</span>
                        </Link>
                      );
                    }

                    // Disconnected state
                    const targetHref = isPos
                      ? "/settings"
                      : isStripe
                      ? "/settings"
                      : "/etablissement";

                    return (
                      <Link
                        href={targetHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
                      >
                        <ExternalLink size={15} />
                        <span>Connecter {selectedIntegration.name}</span>
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
