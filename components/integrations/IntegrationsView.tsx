"use client";

import type { IntegrationItem } from "@/lib/data/integrations";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  X,
  CreditCard,
  Store,
  MessageSquare,
  Truck,
  Mail,
  Shield,
  Key,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Square, Stripe, Google, UberEats, Gmail } from "@/components/ui/BrandIcons";

import { SiteSyncCard } from "@/components/minerva/SiteSyncCard";

export function IntegrationsView({
  initialIntegrations,
  restaurantName,
}: {
  initialIntegrations: IntegrationItem[];
  restaurantName: string;
}) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(
    initialIntegrations[0] || null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredIntegrations = integrations.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory
  );

  const getIcon = (iconName: IntegrationItem["iconName"]) => {
    switch (iconName) {
      case "square":
        return <Square size={22} />;
      case "stripe":
        return <Stripe size={22} />;
      case "google":
        return <Google size={22} />;
      case "delivery":
        return <UberEats size={22} />;
      case "resend":
        return <Gmail size={22} />;
      default:
        return <Zap size={22} className="text-mv-green-dark" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mv-green-tint px-2.5 py-0.5 text-[11px] font-bold text-mv-green-dark uppercase tracking-wider">
              {restaurantName}
            </span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-mv-ink mt-1">
            Intégrations & Connexions
          </h1>
          <p className="text-[13.5px] text-mv-ink-soft">
            Gérez les synchronisations en direct avec votre système de caisse POS, vos paiements, vos livraisons et vos avis.
          </p>
        </div>

        <Link
          href="/etablissement"
          className="flex items-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 text-[13px] font-semibold text-mv-ink shadow-mv-sm transition-all hover:bg-mv-cream-soft shrink-0"
        >
          <Settings size={16} />
          <span>Paramètres de l&apos;établissement</span>
        </Link>
      </div>

      {/* Live Site ↔ Dashboard Publishing Card */}
      <div className="mb-6 mt-6">
        <SiteSyncCard
          restaurantId="demo-rest-id"
          initialShowcase={{
            restaurantId: "demo-rest-id",
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

      {/* POS Auto-Sync & Realtime Inventory Deduction Card (Flow 2) */}
      <Card className="mb-6 p-5 border-mv-green/30 bg-gradient-to-br from-mv-surface via-mv-cream/20 to-white shadow-mv-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-mv-border-soft">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-mv-green text-white text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Hub POS & Ops Unifié
              </span>
              <h2 className="font-display text-[18px] font-bold text-mv-ink">
                Auto-Synchro Caisse POS (Square / Clover / Lightspeed) & Déduction d'Inventaire
              </h2>
            </div>
            <p className="text-[13px] text-mv-ink-soft">
              Zéro double saisie : chaque vente POS déduit instantanément vos matières premières et met à jour le chiffre d'affaires et le planning horaire.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-mv-green-dark bg-mv-green/10 border border-mv-green/20 px-3 py-1.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-mv-green animate-pulse" />
              Synchro POS Active (0.4s de latence)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="rounded-xl border border-mv-border-soft bg-white p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-mv-ink-soft">Ventes POS du jour</span>
              <span className="text-[11px] font-bold text-mv-green-dark bg-mv-green/10 px-1.5 py-0.5 rounded">Auto-synchro</span>
            </div>
            <p className="font-display text-[20px] font-bold text-mv-ink">142 tickets</p>
            <p className="text-[11.5px] text-mv-ink-faint">Square POS · 3,420 $ bruts</p>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-white p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-mv-ink-soft">Déduction Stocks en direct</span>
              <span className="text-[11px] font-bold text-mv-green-dark bg-mv-green/10 px-1.5 py-0.5 rounded">En direct</span>
            </div>
            <p className="font-display text-[20px] font-bold text-mv-ink">384 articles déduits</p>
            <p className="text-[11.5px] text-mv-ink-faint">Dernier ticket : #1048 (-2 Burgers, -1 Frites)</p>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-white p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-mv-ink-soft">Horaire & Masse Salariale</span>
              <span className="text-[11px] font-bold text-mv-green-dark bg-mv-green/10 px-1.5 py-0.5 rounded">Optimal</span>
            </div>
            <p className="font-display text-[20px] font-bold text-mv-ink">22.4 % de Ratio Paie</p>
            <p className="text-[11.5px] text-mv-ink-faint">Aligné sur le budget cible</p>
          </div>
        </div>
      </Card>

      {/* Category Pills Bar (Sana AI style) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            selectedCategory === "all"
              ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
              : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
          }`}
        >
          Toutes les intégrations ({integrations.length})
        </button>
        <button
          onClick={() => setSelectedCategory("caisse")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            selectedCategory === "caisse"
              ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
              : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
          }`}
        >
          Point de Vente (POS)
        </button>
        <button
          onClick={() => setSelectedCategory("paiement")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            selectedCategory === "paiement"
              ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
              : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
          }`}
        >
          Paiements & Stripe
        </button>
        <button
          onClick={() => setSelectedCategory("marketing")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            selectedCategory === "marketing"
              ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
              : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
          }`}
        >
          Google & Avis
        </button>
        <button
          onClick={() => setSelectedCategory("livraison")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            selectedCategory === "livraison"
              ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
              : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
          }`}
        >
          Livraison & Commandes
        </button>
      </div>

      {/* Main Split-Screen Container (Sana AI style - Image 4) */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Integrations Cards Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIntegrations.map((item) => {
            const isSelected = selectedIntegration?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedIntegration(item)}
                className={`group flex flex-col justify-between rounded-2xl border p-5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-mv-green bg-mv-surface shadow-mv-md ring-2 ring-mv-green/30"
                    : "border-mv-border bg-mv-surface hover:border-mv-green-dark hover:shadow-mv-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border-soft">
                      {getIcon(item.iconName)}
                    </div>

                    {item.status === "connected" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-mv-green-tint px-2.5 py-1 text-[11px] font-bold text-mv-green-dark">
                        <CheckCircle2 size={13} /> Connecté
                      </span>
                    ) : item.status === "pending" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-mv-amber-bg px-2.5 py-1 text-[11px] font-bold text-mv-amber">
                        <AlertCircle size={13} /> En cours
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-mv-cream-soft px-2.5 py-1 text-[11px] font-bold text-mv-ink-soft">
                        <XCircle size={13} /> Non connecté
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 font-display text-[16px] font-bold text-mv-ink group-hover:text-mv-green-dark transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-mv-ink-soft">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-mv-border-soft pt-3 text-[11.5px] text-mv-ink-faint">
                  <span>Catégorie : {item.category}</span>
                  <span className="font-semibold text-mv-green-dark group-hover:underline">
                    Gérer →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Split-Pane Detail Drawer (Sana AI style - Image 4) */}
        {selectedIntegration && (
          <div className="w-full lg:w-[420px] shrink-0">
            <Card padded={false} className="sticky top-6 border-mv-border bg-mv-surface shadow-mv-md overflow-hidden">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-mv-border p-4 bg-mv-cream-soft">
                <div className="flex items-center gap-2.5">
                  {getIcon(selectedIntegration.iconName)}
                  <div>
                    <h3 className="font-bold text-[14px] text-mv-ink">{selectedIntegration.name}</h3>
                    <p className="text-[11px] text-mv-ink-soft">Statut : {selectedIntegration.status}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIntegration(null)}
                  className="rounded-lg p-1 text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Integration Details Box */}
                <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4 space-y-3">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Dernière synchro :</span>
                    <span className="font-semibold text-mv-ink">
                      {selectedIntegration.connectedAt || "Jamais synchronisé"}
                    </span>
                  </div>
                  {selectedIntegration.details &&
                    Object.entries(selectedIntegration.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-[12.5px]">
                        <span className="text-mv-ink-soft capitalize">{key} :</span>
                        <span className="font-mono text-[11.5px] font-semibold text-mv-ink truncate max-w-[180px]">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Connection Status Overview */}
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">
                    Accès & Sécurité
                  </h4>
                  <div className="mt-2 space-y-2 text-[12.5px] text-mv-ink-soft">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-mv-green-dark" />
                      <span>Authentification OAuth 2.0 vérifiée</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-mv-green-dark" />
                      <span>Chiffrement des clés d&apos;API de bout en bout</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-2">
                  {selectedIntegration.status === "connected" ? (
                    <>
                      <button
                        onClick={() => alert(`Synchronisation forcé pour ${selectedIntegration.name}`)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
                      >
                        <RefreshCw size={15} />
                        <span>Forcer la synchronisation en direct</span>
                      </button>

                      <Link
                        href="/etablissement"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 text-[13px] font-semibold text-mv-ink transition-all hover:bg-mv-cream-soft"
                      >
                        <Settings size={15} />
                        <span>Configurer dans les paramètres</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/etablissement"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
                    >
                      <ExternalLink size={15} />
                      <span>Connecter {selectedIntegration.name}</span>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
