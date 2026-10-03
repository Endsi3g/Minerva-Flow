import { Card, CardHeader } from "@/components/minerva/PageCard";
import type { TeamMetricsSnapshot } from "@/lib/data/team-metrics";

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(value < 10 && value > 0 ? 1 : 0)} %`;
}

export function GtmFunnelCard({ metrics }: { metrics: TeamMetricsSnapshot }) {
  const { stages, demosExcluded } = metrics.funnel;
  const top = Math.max(stages[0]?.count ?? 0, 1);

  return (
    <Card>
      <CardHeader
        eyebrow="Entonnoir"
        title="Du restaurant inscrit à l’abonné"
        description={`Hors ${demosExcluded} compte${demosExcluded > 1 ? "s" : ""} démo ou test.`}
      />
      <ol className="space-y-4">
        {stages.map((stage) => (
          <li key={stage.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-mv-ink">{stage.label}</span>
              <span className="font-display text-[22px] font-medium leading-none text-mv-ink">{stage.count}</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-mv-border-soft"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={top}
              aria-valuenow={stage.count}
              aria-label={stage.label}
            >
              <div className="h-full rounded-full bg-mv-green transition-all" style={{ width: `${(stage.count / top) * 100}%` }} />
            </div>
            {stage.key !== "registered" && (
              <p className="mt-1 text-[11.5px] text-mv-ink-faint">
                {pct(stage.conversionFromPrevious)} de l’étape précédente
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-mv-cream-soft p-3 text-[12px] leading-relaxed text-mv-ink-soft">
        <p>
          <span className="font-semibold text-mv-ink">Trafic · 30 jours : </span>
          {metrics.visitors ? `${metrics.visitors.total} visiteurs uniques` : "non branché (clé PostHog manquante)"}. Affiché à part : une fenêtre de 30 jours ne se divise pas par un cumul de restaurants, donc aucun taux visiteurs → inscrits n’est calculé.
        </p>
        <p className="mt-2">
          <span className="font-semibold text-mv-ink">Activé</span> = au moins 1 article publié et 1 client inscrit. Seuls les comptes marqués démo ou test sont exclus : un compte interne non marqué compte comme un restaurant.
        </p>
      </div>
    </Card>
  );
}
