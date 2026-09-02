"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { sendManualRetentionNudgeAction, shareImpactResultsAction } from "./actions";
import type { LtvImpact } from "@/lib/engine/impact";
import type { AtRiskCustomer } from "@/lib/data/impact";
import { DollarSign, TrendingUp, Repeat, Users, Send, Clock, TrendingDown, Gift, Share2, UtensilsCrossed, ArrowRight } from "lucide-react";

const triggerLabel: Record<AtRiskCustomer["trigger"], string> = {
  inactivity: "N'est pas revenu depuis un moment",
  value_drift: "Vient moins souvent qu'avant",
  birthday: "Anniversaire",
  reward_available: "A assez de points pour une récompense",
};

const triggerIcon: Record<AtRiskCustomer["trigger"], typeof Clock> = {
  inactivity: Clock,
  value_drift: TrendingDown,
  birthday: Clock,
  reward_available: Gift,
};

export function ImpactView({
  restaurantName,
  impact,
  monthRevenue,
  atRiskCustomers,
  retentionEngineEnabled,
}: {
  restaurantName: string | null;
  impact: LtvImpact | null;
  monthRevenue: number;
  atRiskCustomers: AtRiskCustomer[];
  retentionEngineEnabled: boolean;
}) {
  if (!impact) {
    return (
      <div>
        <PageHeader eyebrow="Résultats fidélisation" title="Ce que la fidélisation vous rapporte" />
        <EmptyState
          icon={TrendingUp}
          title="Aucun établissement sélectionné"
          description="Choisissez un établissement pour voir ce que la fidélisation lui rapporte."
        />
      </div>
    );
  }

  const { visitFrequency } = impact;
  const hasEnoughData = visitFrequency.hasEnoughSignal;
  const touchedShare = hasEnoughData
    ? (visitFrequency.touchedPerMonth / (visitFrequency.touchedPerMonth + visitFrequency.untouchedPerMonth || 1)) * 100
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Résultats fidélisation"
        title="Ce que la fidélisation vous rapporte"
        description={
          restaurantName
            ? `Ce que vos relances automatiques rapportent chez ${restaurantName} — et les clients à relancer dès maintenant.`
            : "Ce que vos relances automatiques rapportent — et les clients à relancer dès maintenant."
        }
        action={<ShareResultsButton incrementalRevenue={impact.incrementalRevenue} />}
      />

      <ActionableCustomersCard retentionEngineEnabled={retentionEngineEnabled} initialCustomers={atRiskCustomers} />

      <AlertBanner tone="info" title="Comment lire les chiffres ci-dessous" className="mb-6 mt-6">
        On ne compare pas un « avant / après » — un établissement qui vient tout juste d&apos;activer la fidélisation
        n&apos;a pas d&apos;historique à comparer. On compare plutôt, sur la même période, les clients qui ont reçu une
        relance à ceux qui n&apos;en ont pas reçu.
      </AlertBanner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <RadialGauge
            value={monthRevenue ? (impact.incrementalRevenue / monthRevenue) * 100 : 0}
            color="var(--mv-green)"
            centerValue={`${monthRevenue ? Math.round((impact.incrementalRevenue / monthRevenue) * 100) : 0}%`}
            centerLabel="du mois"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <DollarSign size={13} /> Ventes grâce à la fidélisation
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Achats en plus générés par vos relances automatiques, ce mois-ci.
            </p>
            <p className="mt-1 font-display text-[17px] font-medium text-mv-ink">
              {formatCurrency(impact.incrementalRevenue)}
            </p>
            <p className="mt-0.5 text-[12px] text-mv-ink-soft">Visites dans les 14 jours suivant une relance</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          {impact.hasMenuMarginData ? (
            <RadialGauge
              value={impact.activeMarginPct}
              color="var(--mv-green)"
              centerValue={`${impact.activeMarginPct.toFixed(0)}%`}
              centerLabel="marge"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-faint">
              <UtensilsCrossed size={22} />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <TrendingUp size={13} /> Marge du menu actif
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Marge de ce qui est au menu aujourd&apos;hui — retirez un plat à faible marge pour voir ce chiffre bouger.
            </p>
            {impact.hasMenuMarginData ? (
              <p className="mt-1 text-[12px] text-mv-ink-soft">
                {impact.marginGainPct >= 0 ? "+" : ""}
                {impact.marginGainPct.toFixed(1)} pt vs le menu complet (plats retirés inclus)
              </p>
            ) : (
              <Link href="/menu" className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark">
                Ajoutez vos plats et leur coût pour voir votre marge
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={touchedShare}
            color="var(--mv-lime-dark)"
            centerValue={hasEnoughData ? `×${visitFrequency.multiplier.toFixed(1)}` : "—"}
            centerLabel="plus souvent"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <Repeat size={13} /> Reviennent plus souvent
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Clients touchés par une relance, comparés à ceux qui n&apos;en ont pas reçu.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            eyebrow="Détail"
            title="À quelle fréquence vos clients reviennent"
            description="Nombre moyen de visites par mois, selon qu'ils ont reçu une relance ou non."
          />
          {hasEnoughData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-mv-green/20 bg-mv-green-tint p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-green-dark">
                  <Users size={13} /> Ont reçu une relance
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-green-darker">
                  {visitFrequency.touchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">visites/mois</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.touchedCount} client(s)</p>
              </div>
              <div className="rounded-xl border border-mv-border bg-mv-cream-soft p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <Users size={13} /> N&apos;en ont jamais reçu
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
                  {visitFrequency.untouchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">visites/mois</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.untouchedCount} client(s)</p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">
              Pas encore assez de données — activez la rétention automatique et laissez quelques relances partir pour
              voir ce comparatif.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ShareResultsButton({ incrementalRevenue }: { incrementalRevenue: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleShare() {
    setSending(true);
    try {
      const ok = await shareImpactResultsAction(incrementalRevenue, note);
      if (ok) {
        toast.success("Résultats partagés avec l'équipe.");
        setOpen(false);
        setNote("");
      } else {
        notifyError("Le partage a échoué.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Share2 size={14} /> Partager avec l&apos;équipe
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Partager avec l'équipe"
        description="Envoie une notification à tous les membres actifs de l'établissement, avec un lien vers cette page."
      >
        <div className="space-y-4">
          <Field label="Message" hint="Optionnel">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Ex. : ${formatCurrency(incrementalRevenue)} générés ce mois grâce à la fidélisation !`}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={handleShare} disabled={sending}>
              {sending ? "Envoi…" : "Partager"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ActionableCustomersCard({
  retentionEngineEnabled,
  initialCustomers,
}: {
  retentionEngineEnabled: boolean;
  initialCustomers: AtRiskCustomer[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleSend(customerId: string, trigger: AtRiskCustomer["trigger"]) {
    setSendingId(customerId);
    try {
      const result = await sendManualRetentionNudgeAction(customerId, trigger);
      if (result.ok) {
        toast.success("Relance envoyée.");
        setCustomers((prev) => prev.filter((c) => c.customer.id !== customerId));
      } else {
        notifyError("L'envoi a échoué — vérifiez que ce client a un courriel, un téléphone ou un compte portail.");
      }
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader
        eyebrow="À faire aujourd'hui"
        title="Clients à relancer maintenant"
        description="Ces clients contribuent directement à « Ventes grâce à la fidélisation » ci-dessous — relancez-les au lieu d'attendre l'envoi automatique de demain."
      />
      {!retentionEngineEnabled ? (
        <p className="text-[12.5px] text-mv-ink-faint">
          La rétention automatique n&apos;est pas encore activée — activez-la depuis{" "}
          <Link href="/fidelisation" className="font-semibold text-mv-green-dark hover:underline">
            Fidélisation
          </Link>{" "}
          pour voir ici les clients à relancer.
        </p>
      ) : customers.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">
          Aucun client à relancer pour l&apos;instant. Revenez plus tard, ou{" "}
          <Link href="/fidelisation" className="font-semibold text-mv-green-dark hover:underline">
            ajustez vos automatisations
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-1.5">
          {customers.map(({ customer, trigger }) => {
            const Icon = triggerIcon[trigger];
            return (
              <div
                key={customer.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-mv-border-soft px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link href={`/fidelisation/${customer.id}`} className="text-[13px] font-semibold text-mv-ink hover:underline">
                    {customer.name}
                  </Link>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-mv-ink-faint">
                    <Icon size={12} /> {triggerLabel[trigger]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral">{formatCurrency(customer.totalSpent)} dépensés</Badge>
                  <Button
                    size="xs"
                    onClick={() => handleSend(customer.id, trigger)}
                    disabled={sendingId === customer.id}
                  >
                    <Send size={12} />
                    {sendingId === customer.id ? "Envoi…" : "Relancer"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
