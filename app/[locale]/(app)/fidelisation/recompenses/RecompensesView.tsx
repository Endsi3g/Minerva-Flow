"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, Bell, Store, AlertTriangle } from "lucide-react";
import { loyaltyTierOrder, loyaltyTierBadge } from "@/lib/loyalty-tiers";
import { cn } from "@/lib/utils";
import type { VisitRewardTier } from "@/lib/types";
import { updateVisitRewardTiersAction } from "../actions";
import { notifyError } from "@/lib/notify-error";

export function RecompensesView({
  restaurantId,
  initialEnabled,
  initialTiers,
}: {
  restaurantId: string | null;
  initialEnabled: boolean;
  initialTiers: VisitRewardTier[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tiers, setTiers] = useState(initialTiers);
  const [simVisits, setSimVisits] = useState(12);

  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.visits - b.visits), [tiers]);
  const maxVisits = sortedTiers[sortedTiers.length - 1]?.visits || 1;
  const currentTier = useMemo(() => {
    let current: VisitRewardTier | null = null;
    for (const t of sortedTiers) {
      if (simVisits >= t.visits) current = t;
    }
    return current;
  }, [sortedTiers, simVisits]);
  const nextTier = useMemo(() => {
    const idx = currentTier ? sortedTiers.findIndex((t) => t.id === currentTier.id) : -1;
    return sortedTiers[idx + 1] ?? null;
  }, [sortedTiers, currentTier]);

  // Validation is inline, not blocking: an invalid edit stays visible and
  // uncommitted (handleTierBlur skips the save) until fixed — never
  // silently persisted (an empty reward would otherwise ship in the
  // customer email as "vous avez débloqué «  »").
  const emptyRewardIds = useMemo(() => new Set(tiers.filter((t) => !t.reward.trim()).map((t) => t.id)), [tiers]);
  const duplicateVisitIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of tiers) counts.set(t.visits, (counts.get(t.visits) ?? 0) + 1);
    return new Set(tiers.filter((t) => (counts.get(t.visits) ?? 0) > 1).map((t) => t.id));
  }, [tiers]);
  const hasErrors = emptyRewardIds.size > 0 || duplicateVisitIds.size > 0;

  async function persist(nextTiers: VisitRewardTier[]) {
    setTiers(nextTiers);
    const ok = await updateVisitRewardTiersAction(restaurantId!, { tiers: nextTiers });
    if (!ok) notifyError("La mise à jour a échoué.");
  }

  async function handleToggleEnabled(next: boolean) {
    setEnabled(next);
    const ok = await updateVisitRewardTiersAction(restaurantId!, { enabled: next });
    if (!ok) {
      setEnabled(!next);
      notifyError("La mise à jour a échoué.");
    }
  }

  function updateTierField(id: string, field: "label" | "reward", value: string) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  function updateTierVisits(id: string, value: number) {
    const clamped = Math.max(1, value || 1);
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, visits: clamped } : t)));
  }

  async function handleTierActiveToggle(id: string, active: boolean) {
    await persist(tiers.map((t) => (t.id === id ? { ...t, active } : t)));
  }

  async function handleTierBlur() {
    if (hasErrors) return;
    await persist(tiers);
  }

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Fidélisation" title="Récompenses par palier de visite" />
        <EmptyState icon={Store} title="Aucun restaurant sélectionné" description="Configurez un restaurant pour activer cette fonctionnalité." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl w-full">
      <Link href="/fidelisation" className="mb-3 inline-flex items-center gap-1 text-[13px] text-mv-ink-faint hover:text-mv-ink">
        <ChevronLeft size={14} /> Fidélisation
      </Link>

      <PageHeader
        eyebrow="Fidélisation"
        title="Récompenses par palier de visite"
        description="Déclenchez une récompense automatiquement dès qu'un client atteint un palier de visites — aucune action requise de sa part, ni de la vôtre."
        action={
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-mv-ink-soft">Automatisation</span>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              className="data-checked:bg-mv-green"
              aria-label={enabled ? "Désactiver l'automatisation" : "Activer l'automatisation"}
            />
          </div>
        }
      />

      {hasErrors && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-mv-red/30 bg-mv-red-bg px-3 py-2.5 text-[12.5px] font-medium text-mv-red">
          <AlertTriangle size={14} className="shrink-0" />
          Corrigez les champs en rouge ci-dessous — vos changements ne sont pas encore enregistrés.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={enabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
          {tiers.map((tier, i) => {
            const toneKey = loyaltyTierOrder[i] ?? loyaltyTierOrder[loyaltyTierOrder.length - 1];
            const { tone, variant, icon: Icon } = loyaltyTierBadge[toneKey];
            return (
              <Card key={tier.id}>
                <div className="flex items-start gap-3.5">
                  <Badge tone={tone} variant={variant} size="lg" className="shrink-0 rounded-xl px-2.5 py-2.5">
                    <Icon size={16} strokeWidth={2.2} />
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        value={tier.label}
                        onChange={(e) => updateTierField(tier.id, "label", e.target.value)}
                        onBlur={handleTierBlur}
                        className="min-w-0 max-w-[220px] flex-1 bg-transparent font-display text-[16px] font-medium text-mv-ink outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11.5px] font-semibold text-mv-ink-faint">Actif</span>
                        <Switch
                          checked={tier.active !== false}
                          onCheckedChange={(next) => handleTierActiveToggle(tier.id, next)}
                          size="sm"
                          className="data-checked:bg-mv-green"
                          aria-label={tier.active !== false ? `Désactiver ${tier.label}` : `Activer ${tier.label}`}
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-semibold text-mv-ink-soft">
                          Déclenché à la visite n°
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={tier.visits}
                          onChange={(e) => updateTierVisits(tier.id, Number(e.target.value))}
                          onBlur={handleTierBlur}
                          className={cn(
                            "h-9 w-full rounded-lg border bg-mv-surface px-3 text-[13.5px] text-mv-ink outline-none focus-visible:border-mv-green",
                            duplicateVisitIds.has(tier.id) ? "border-mv-red" : "border-mv-border"
                          )}
                        />
                        {duplicateVisitIds.has(tier.id) && (
                          <p className="mt-1 text-[11px] text-mv-red">Ce seuil est déjà utilisé par un autre palier.</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[12px] font-semibold text-mv-ink-soft">Récompense</label>
                        <input
                          value={tier.reward}
                          onChange={(e) => updateTierField(tier.id, "reward", e.target.value)}
                          onBlur={handleTierBlur}
                          className={cn(
                            "h-9 w-full rounded-lg border bg-mv-surface px-3 text-[13.5px] text-mv-ink outline-none focus-visible:border-mv-green",
                            emptyRewardIds.has(tier.id) ? "border-mv-red" : "border-mv-border"
                          )}
                        />
                        {emptyRewardIds.has(tier.id) && (
                          <p className="mt-1 text-[11px] text-mv-red">Requis — ce texte est envoyé au client.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mv-ink-faint">Aperçu client</p>
          <p className="mb-4 text-[13px] text-mv-ink-soft">
            Simulez la progression d&apos;un client fictif pour prévisualiser la notification.
          </p>

          <div className="mb-4 rounded-xl border border-mv-green/15 bg-mv-green-tint p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Bell size={13} className="text-mv-green-dark" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-mv-green-dark">Palier atteint</span>
            </div>
            <p className="font-display text-[15px] font-medium text-mv-ink">
              {currentTier ? currentTier.label : "Aucun palier atteint"}
            </p>
            <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
              {currentTier ? currentTier.reward : "Ce client n'a pas encore débloqué de récompense."}
            </p>
          </div>

          <label className="mb-2 block text-[12px] font-semibold text-mv-ink-soft">
            Visites du client simulé : {simVisits}
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(30, maxVisits)}
            value={simVisits}
            onChange={(e) => setSimVisits(Number(e.target.value))}
            className="w-full accent-mv-green"
          />
          <p className="mt-2.5 text-[12px] text-mv-ink-faint">
            {nextTier
              ? `${nextTier.visits - simVisits} visite${nextTier.visits - simVisits > 1 ? "s" : ""} avant « ${nextTier.label} »`
              : "Palier maximum atteint."}
          </p>
        </Card>
      </div>
    </div>
  );
}
