import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FlowBars } from "@/components/charts/FlowBars";
import { inflows, outflows, connections } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { ConnectionStatus, ConnectionType } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Bike,
  Mail,
  Plus,
  RefreshCw,
} from "lucide-react";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
};

const typeLabel: Record<ConnectionType, string> = {
  banque: "Compte bancaire",
  pos: "Point de vente",
  livraison: "Plateforme de livraison",
  email: "Outil email",
};

const statusTone: Record<ConnectionStatus, "green" | "red" | "amber"> = {
  connecte: "green",
  erreur: "red",
  attente: "amber",
};

const statusLabel: Record<ConnectionStatus, string> = {
  connecte: "Connecté",
  erreur: "Erreur",
  attente: "En attente",
};

export default function FinancePage() {
  const totalIn = inflows.reduce((s, l) => s + l.amount, 0);
  const totalOut = outflows.reduce((s, l) => s + l.amount, 0);
  const net = totalIn - totalOut;

  return (
    <div>
      <PageHeader
        eyebrow="Flux financiers"
        title="Finance"
        description="D'où vient l'argent, où il part, et l'état de vos connexions bancaires et plateformes."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <StatCard
          label="Entrées"
          value={formatCurrency(totalIn)}
          icon={ArrowDownLeft}
          sublabel="ce mois-ci"
          accent="green"
        />
        <StatCard
          label="Sorties"
          value={formatCurrency(totalOut)}
          icon={ArrowUpRight}
          sublabel="ce mois-ci"
          accent="ink"
        />
        <StatCard
          label="Flux net"
          value={formatCurrency(net)}
          icon={Landmark}
          sublabel={`${Math.round((net / totalIn) * 100)}% des entrées`}
          accent="lime"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="D'où l'argent vient"
            title="Entrées de revenu"
            description="Répartition des sources d'encaissement"
          />
          <FlowBars lines={inflows} tone="green" />
        </Card>
        <Card>
          <CardHeader
            eyebrow="Où l'argent part"
            title="Sorties de charges"
            description="Répartition des dépenses courantes"
          />
          <FlowBars lines={outflows} tone="ink" />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Connexions"
            description="Comptes bancaires, caisses et plateformes reliés à Minerva Flow"
            action={
              <Button size="sm" variant="secondary">
                <Plus size={15} /> Connecter un compte
              </Button>
            }
          />
          <div className="divide-y divide-mv-border-soft">
            {connections.map((c) => {
              const Icon = typeIcon[c.type];
              return (
                <div key={c.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mv-cream-soft text-mv-ink-soft">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-mv-ink">{c.name}</p>
                    <p className="text-[12px] text-mv-ink-faint">
                      {typeLabel[c.type]} · {c.lastSync}
                    </p>
                    {c.detail && (
                      <p className="mt-0.5 text-[12px] text-mv-red">{c.detail}</p>
                    )}
                  </div>
                  <Badge tone={statusTone[c.status]} dot>
                    {statusLabel[c.status]}
                  </Badge>
                  {c.status === "erreur" && (
                    <Button size="sm" variant="secondary">
                      <RefreshCw size={13} /> Reconnecter
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
