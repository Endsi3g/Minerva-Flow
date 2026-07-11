import { formatCurrency } from "@/lib/utils";
import type { FlowLine } from "@/lib/types";

export function FlowBars({
  lines,
  tone = "green",
}: {
  lines: FlowLine[];
  tone?: "green" | "ink";
}) {
  const barColor = tone === "green" ? "var(--mv-green)" : "var(--mv-ink-soft)";
  const trackColor = tone === "green" ? "var(--mv-green-tint)" : "var(--mv-cream-soft)";

  return (
    <div className="space-y-3.5">
      {lines.map((l) => (
        <div key={l.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-mv-ink">{l.label}</span>
            <span className="shrink-0 text-[13px] font-semibold text-mv-ink">
              {formatCurrency(l.amount)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: trackColor }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${l.pct}%`, background: barColor }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
