"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { loyaltyTierOrder, loyaltyTierLabel, loyaltyTierDescription, loyaltyTierBadge, type LoyaltyTierThresholds } from "@/lib/loyalty-tiers";
import { Zap, Coins } from "lucide-react";
import { useState } from "react";
import { updateRetentionSettingsAction, updateLoyaltyTierThresholdsAction, updateLoyaltyRateAction } from "../actions";
import { notifyError } from "@/lib/notify-error";

function LoyaltyRateCard({ restaurantId, initialRate }: { restaurantId: string; initialRate: number }) {
  const [rate, setRate] = useState(initialRate);

  async function handleBlur() {
    if (rate === initialRate) return;
    await updateLoyaltyRateAction(restaurantId, rate);
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Points"
        title="Taux d'accumulation"
        description="Points attribués par dollar dépensé — s'applique aux prochaines visites."
      />
      <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
        <Coins size={13} className="text-mv-green-dark" />
        Un client gagne
        <input
          type="number"
          min="0"
          step="0.5"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          onBlur={handleBlur}
          className="h-7 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12.5px]"
        />
        point{rate !== 1 ? "s" : ""} par dollar dépensé.
      </div>
    </Card>
  );
}

function RetentionSettingsCard({
  restaurantId,
  initialEnabled,
  initialInactivityDays,
}: {
  restaurantId: string;
  initialEnabled: boolean;
  initialInactivityDays: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [inactivityDays, setInactivityDays] = useState(initialInactivityDays);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setIsSaving(true);
    try {
      const ok = await updateRetentionSettingsAction(restaurantId, { enabled: next });
      if (!ok) {
        setEnabled(!next);
        notifyError("La mise à jour a échoué.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivityBlur() {
    if (inactivityDays === initialInactivityDays) return;
    await updateRetentionSettingsAction(restaurantId, { inactivityDays });
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Automatisation"
        title="Rétention automatique"
        description="Relance par courriel/SMS/notification les clients inactifs, ceux qui décrochent, et pour leur anniversaire — sans intervention."
        action={
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
            className="data-checked:bg-mv-green"
            aria-label={enabled ? "Désactiver la rétention automatique" : "Activer la rétention automatique"}
          />
        }
      />
      <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
        <Zap size={13} className="text-mv-green-dark" />
        Considérer un client inactif après
        <input
          type="number"
          min="1"
          value={inactivityDays}
          onChange={(e) => setInactivityDays(Number(e.target.value))}
          onBlur={handleInactivityBlur}
          className="h-7 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12.5px]"
        />
        jours sans visite. Seuls les clients ayant consenti à recevoir des offres sont ciblés.
        <HelperTooltip content="Un même client n'est jamais relancé deux fois pour la même chose : anniversaire, décrochage et inactivité sont priorisés dans cet ordre, et un délai minimal (30 jours par défaut) s'applique toujours entre deux relances." />
      </div>
    </Card>
  );
}

function LoyaltyTierSettingsCard({
  restaurantId,
  initialThresholds,
}: {
  restaurantId: string;
  initialThresholds: LoyaltyTierThresholds;
}) {
  const [tier2, setTier2] = useState(initialThresholds.tier2);
  const [tier3, setTier3] = useState(initialThresholds.tier3);

  async function handleBlur(patch: { tier2?: number; tier3?: number }) {
    await updateLoyaltyTierThresholdsAction(restaurantId, patch);
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Statut client"
        title={
          <span className="flex items-center gap-1.5">
            Paliers de fidélité
            <HelperTooltip content="Le seuil correspond à la dépense cumulée à vie du client (total_spent), recalculée automatiquement à chaque visite — aucune attribution manuelle n'est nécessaire." />
          </span>
        }
        description="Une progression premium plutôt que des paliers génériques — le palier le plus élevé est le meilleur candidat pour parrainer."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loyaltyTierOrder.map((tier, i) => {
          const { tone, variant, icon: Icon } = loyaltyTierBadge[tier];
          return (
            <div key={tier} className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3">
              <Badge tone={tone} variant={variant}>
                <Icon size={12} strokeWidth={2.4} />
                {loyaltyTierLabel[tier]}
              </Badge>
              <p className="mt-2 text-[11.5px] leading-snug text-mv-ink-faint">{loyaltyTierDescription[tier]}</p>
              <p className="mt-2 text-[12px] text-mv-ink-soft">
                {i === 0 ? (
                  "Dès l'inscription"
                ) : (
                  <>
                    Dès{" "}
                    <input
                      type="number"
                      min="0"
                      value={i === 1 ? tier2 : tier3}
                      onChange={(e) => (i === 1 ? setTier2(Number(e.target.value)) : setTier3(Number(e.target.value)))}
                      onBlur={() => handleBlur(i === 1 ? { tier2 } : { tier3 })}
                      className="h-7 w-20 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12px]"
                    />{" "}
                    $ dépensés
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ParametresView({
  restaurantId,
  loyaltyPointsPerDollar,
  loyaltyTierThresholds,
  retentionEngineEnabled,
  retentionInactivityDays,
}: {
  restaurantId: string | null;
  loyaltyPointsPerDollar: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
  retentionEngineEnabled: boolean;
  retentionInactivityDays: number;
}) {
  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Taux de points, paliers de fidélité et automatisation de la rétention."
      />
      {restaurantId && (
        <div className="space-y-6">
          <LoyaltyRateCard restaurantId={restaurantId} initialRate={loyaltyPointsPerDollar} />
          <LoyaltyTierSettingsCard restaurantId={restaurantId} initialThresholds={loyaltyTierThresholds} />
          <RetentionSettingsCard
            restaurantId={restaurantId}
            initialEnabled={retentionEngineEnabled}
            initialInactivityDays={retentionInactivityDays}
          />
        </div>
      )}
    </div>
  );
}
