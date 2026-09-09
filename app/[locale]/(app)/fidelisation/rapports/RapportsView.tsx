"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import type { ErpMoneyMetrics } from "@/lib/data/erp-metrics";
import { DollarSign, PiggyBank, QrCode, Gift } from "lucide-react";

function formatMoney(value: number): string {
  return value.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

export function RapportsView({ metrics }: { metrics: ErpMoneyMetrics | null }) {
  return (
    <div>
      <FidelisationSubNav />

      <PageHeader
        eyebrow="ERP"
        title="Rapports"
        description="Utilisation du jumelage de compte, et une estimation de l'argent distribué en points face à ce que la fidélité vous fait réellement conserver."
      />

      {!metrics ? (
        <EmptyState
          icon={DollarSign}
          title="Aucune donnée pour le moment"
          description="Les rapports apparaîtront dès que des visites seront enregistrées."
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Argent distribué"
              value={formatMoney(metrics.moneyDistributed)}
              icon={Gift}
              accent="amber"
              sublabel={`${metrics.pointsRedeemed} pts échangés`}
            />
            <StatCard
              label="Argent conservé"
              value={formatMoney(metrics.moneyRetained)}
              icon={PiggyBank}
              accent="green"
              sublabel={`Sur ${formatMoney(metrics.totalRevenue)} de revenu fidélité`}
            />
            <StatCard
              label="Codes de jumelage résolus"
              value={metrics.pairingCodesResolved}
              icon={QrCode}
              accent="blue"
              sublabel="Derniers 30 jours"
            />
            <StatCard
              label="Visites via jumelage"
              value={metrics.visitsViaPairingCode}
              icon={QrCode}
              accent="purple"
              sublabel={`${metrics.pointsViaPairingCode} pts · ${formatMoney(metrics.revenueViaPairingCode)}`}
            />
          </div>

          <Card>
            <CardHeader eyebrow="Méthode" title="Comment ces chiffres sont calculés" />
            <div className="space-y-2 text-[12.5px] leading-relaxed text-mv-ink-soft">
              <p>
                <strong className="font-semibold text-mv-ink">Argent distribué</strong> — la valeur en dollars des
                points échangés contre des récompenses ce mois-ci (points ÷ taux de points par dollar). C&apos;est une
                estimation basée sur votre taux actuel, pas un montant réellement décaissé.
              </p>
              <p>
                <strong className="font-semibold text-mv-ink">Argent conservé</strong> — le revenu enregistré via des
                visites fidélité, moins l&apos;argent distribué estimé ci-dessus.
              </p>
              <p>
                <strong className="font-semibold text-mv-ink">Jumelage de compte</strong> — chaque fois qu&apos;un
                membre du personnel retrouve un client avec le code affiché dans l&apos;onglet Scanner (natif) et
                enregistre sa visite dans la même carte, cette visite est comptée ici séparément.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
