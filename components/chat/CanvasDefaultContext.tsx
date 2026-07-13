import { Badge } from "@/components/ui/Badge";
import { computeAlerts } from "@/lib/engine/alerts";
import { alertRules, connections, kpis, programs, serviceDays } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const severityTone = { critique: "red", important: "amber", info: "neutral" } as const;

/**
 * Default Canvas panel content, shown until the current conversation has
 * produced an artifact — same KPI/alerts/programs snapshot the old
 * /assistant "Contexte" aside showed.
 */
export function CanvasDefaultContext() {
  const alerts = computeAlerts({
    serviceDays,
    connections,
    alertRules,
    financialTransactions: [],
  }).slice(0, 4);
  const activePrograms = programs.filter((p) => p.status === "actif").slice(0, 3);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Contexte
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-mv-cream-soft p-2.5">
            <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Revenu</p>
            <p className="font-display text-[15px] font-medium text-mv-ink">
              {formatCurrency(kpis.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-mv-cream-soft p-2.5">
            <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Marge</p>
            <p className="font-display text-[15px] font-medium text-mv-ink">
              {formatCurrency(kpis.estimatedMargin)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Alertes actives
        </p>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-[12px] text-mv-ink-faint">Aucune alerte.</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-mv-border-soft p-2.5">
                <Badge tone={severityTone[a.severity]} dot className="mb-1">
                  {a.title}
                </Badge>
                <p className="text-[11.5px] leading-snug text-mv-ink-soft">{a.detail}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Programmes actifs
        </p>
        <div className="space-y-1.5">
          {activePrograms.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[12.5px]">
              <span className="truncate text-mv-ink-soft">{p.name}</span>
              <span className="shrink-0 font-semibold text-mv-ink">
                {formatCurrency(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
