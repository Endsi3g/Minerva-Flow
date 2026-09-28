import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingDown, Users2, GitCommit, Users, Truck, CalendarClock } from "lucide-react";
import Link from "next/link";

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  badge,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  value: string;
  badge?: { label: string; tone: "green" | "red" };
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all duration-200 hover:shadow-mv-md hover:-translate-y-0.5">
        <div className="flex items-center gap-2 text-mv-ink-faint">
          <Icon size={15} />
          <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="font-display text-[22px] font-medium text-mv-ink">{value}</p>
          {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
        </div>
      </Card>
    </Link>
  );
}

/**
 * A single-glance summary across every domain of the app (revenue,
 * expenses, team, operations) — distinct on purpose from /finance
 * (transaction management) and /overview (day-to-day narrative): this is
 * the "everything, at a glance" page, each tile linking to its own page
 * for detail.
 */
export function DataOverviewView({
  revenue,
  expensesLast30d,
  activeEmployeeCount,
  activeProgramCount,
  memberCount,
  pendingPurchaseOrderCount,
  upcomingReservationCount,
}: {
  revenue: { revenue: number; delta: number };
  expensesLast30d: number;
  activeEmployeeCount: number;
  activeProgramCount: number;
  memberCount: number;
  pendingPurchaseOrderCount: number;
  upcomingReservationCount: number;
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Vue globale"
        title="Données"
        description="Toutes les statistiques clés de l'application, en un coup d'œil."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile
          href="/finance"
          icon={Wallet}
          label="Revenu (mois)"
          value={formatCurrency(revenue.revenue)}
          badge={{ label: `${revenue.delta >= 0 ? "↑" : "↓"} ${Math.abs(revenue.delta).toFixed(1)}%`, tone: revenue.delta >= 0 ? "green" : "red" }}
        />
        <StatTile
          href="/finance"
          icon={TrendingDown}
          label="Dépenses (30j)"
          value={formatCurrency(expensesLast30d)}
        />
        <StatTile href="/employees" icon={Users2} label="Employés actifs" value={String(activeEmployeeCount)} />
        <StatTile href="/programs" icon={GitCommit} label="Programmes actifs" value={String(activeProgramCount)} />
        <StatTile href="/collaborateurs" icon={Users} label="Collaborateurs" value={String(memberCount)} />
        <StatTile href="/fournisseurs" icon={Truck} label="Commandes en cours" value={String(pendingPurchaseOrderCount)} />
        <StatTile
          href="/reservations"
          icon={CalendarClock}
          label="Réservations (30j)"
          value={String(upcomingReservationCount)}
        />
      </div>
    </div>
  );
}
