import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { formatCurrency } from "@/lib/utils";
import type { TeamMetricsSnapshot } from "@/lib/data/team-metrics";

export function GtmFocusCard({ metrics }: { metrics: TeamMetricsSnapshot }) {
  const locale = useLocale();
  const { focus } = metrics;
  const format = (value: number) => (focus.metric === "mrr" ? formatCurrency(value, locale) : String(Math.round(value)));
  const progress = focus.target && focus.target > 0 ? Math.min(100, (focus.actual / focus.target) * 100) : null;

  return (
    <Card>
      <CardHeader eyebrow="Le chiffre du mois" title={focus.label} />
      <p className="font-display text-[44px] font-medium leading-none text-mv-ink">
        {format(focus.actual)}
        <span className="ml-3 text-[18px] font-normal text-mv-ink-faint">
          {focus.target === null ? "cible à définir" : `/ ${format(focus.target)}`}
        </span>
      </p>
      {progress !== null && (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-mv-border-soft"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={focus.label}
        >
          <div className="h-full rounded-full bg-mv-green transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {focus.target === null && (
        <p className="mt-3 text-[12.5px] text-mv-ink-soft">
          <Link href="/equipe/objectifs" className="font-semibold text-mv-green-dark hover:underline">
            Définir la cible du mois
          </Link>
          {" "}pour voir où vous en êtes.
        </p>
      )}

      <h3 className="mt-6 text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">Trois prochaines actions</h3>
      {focus.actions.length === 0 ? (
        <p className="mt-2 text-[13px] text-mv-ink-soft">Rien de bloquant détecté dans les chiffres : gardez le rythme.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {focus.actions.map((action, index) => (
            <li key={action.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-[12px] font-semibold text-mv-green-dark" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-mv-ink">{action.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-mv-ink-soft">{action.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
