"use client";


import { intlLocale } from "@/lib/format-locale";
import { useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import type { GoalRow, GoalsSnapshot } from "@/lib/data/team-goals";
import { saveGoalAction } from "@/app/[locale]/equipe/(portal)/objectifs/actions";

function formatValue(row: GoalRow, value: number | null): string {
  if (value === null) return "—";
  return row.unit === "money" ? formatCurrency(value) : String(Math.round(value));
}

export function GoalsBoard({ goals }: { goals: GoalsSnapshot }) {
  const locale = useLocale();
  const monthLabel = new Date(goals.month).toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-mv-ink">Objectifs du mois</h1>
        <p className="mt-1 text-[13.5px] text-mv-ink-soft">
          {monthLabel} · {Math.round(goals.elapsedPct)} % du mois écoulé. Les chiffres réels se mettent à jour tout seuls ; seules les cibles se saisissent.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.rows.map((row) => (
          <GoalCard key={row.metric} row={row} elapsedPct={goals.elapsedPct} />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ row, elapsedPct }: { row: GoalRow; elapsedPct: number }) {
  const [draft, setDraft] = useState(row.target === null ? "" : String(row.target));
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const progress = row.target && row.target > 0 && row.actual !== null ? Math.min(100, (row.actual / row.target) * 100) : null;
  // "Dans le rythme" when progress keeps pace with the share of the month elapsed.
  const onPace = progress !== null && progress >= elapsedPct;

  function save() {
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      setStatus("error");
      return;
    }
    startTransition(async () => {
      const ok = await saveGoalAction(row.metric, value);
      setStatus(ok ? "saved" : "error");
    });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">{row.label}</p>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-mv-ink">
            {formatValue(row, row.actual)}
            <span className="ml-2 text-[14px] font-normal text-mv-ink-faint">/ {formatValue(row, row.target)}</span>
          </p>
        </div>
        {progress !== null ? (
          <Badge tone={onPace ? "green" : "amber"} variant="subtle" size="sm">
            {onPace ? "dans le rythme" : "en retard sur le rythme"}
          </Badge>
        ) : (
          <Badge tone="neutral" variant="subtle" size="sm">
            {row.target === null ? "cible à définir" : "donnée indisponible"}
          </Badge>
        )}
      </div>

      <div
        className="relative mt-4 h-2 overflow-hidden rounded-full bg-mv-border-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress ?? 0)}
        aria-label={row.label}
      >
        <div className="h-full rounded-full bg-mv-green transition-all" style={{ width: `${progress ?? 0}%` }} />
        <div className="absolute top-0 h-full w-px bg-mv-ink/40" style={{ left: `${elapsedPct}%` }} title="Où on devrait être aujourd’hui" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Input
          type="number"
          min="0"
          inputMode="decimal"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus("idle");
          }}
          placeholder="Cible du mois"
          aria-label={`Cible pour ${row.label}`}
          className="h-9 max-w-[160px] text-[13px]"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || draft.trim() === ""}
          className="h-9 rounded-lg bg-mv-green px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-mv-green-dark disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status === "saved" && (
          <span className="text-[12px] text-mv-green-dark" role="status">
            Enregistré
          </span>
        )}
        {status === "error" && (
          <span className="text-[12px] text-mv-red" role="alert">
            Échec, réessayez
          </span>
        )}
      </div>
    </Card>
  );
}
