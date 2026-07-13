"use client";

import { CanvasDefaultContext } from "@/components/chat/CanvasDefaultContext";
import type { ChatArtifact } from "@/lib/types";

/**
 * Right-hand Canvas panel: renders the latest artifact for the active
 * conversation, or the default KPI/alerts/programs context if none exists
 * yet.
 */
export function CanvasPanel({ artifact }: { artifact: ChatArtifact | null }) {
  if (!artifact) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-mv-border-soft lg:block">
        <CanvasDefaultContext />
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-mv-border-soft p-5 lg:block">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {artifact.title}
      </p>
      <ArtifactBody artifact={artifact} />
    </aside>
  );
}

function ArtifactBody({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.type === "summary") {
    const data = artifact.data as { text: string };
    return <p className="text-[13px] leading-relaxed text-mv-ink-soft">{data.text}</p>;
  }

  if (artifact.type === "table") {
    const data = artifact.data as { columns: string[]; rows: (string | number)[][] };
    return (
      <div className="overflow-x-auto rounded-lg border border-mv-border-soft">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-mv-border-soft bg-mv-cream-soft">
              {data.columns.map((col) => (
                <th key={col} className="px-2.5 py-2 text-left font-semibold text-mv-ink-faint">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-mv-border-soft last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-2.5 py-2 text-mv-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // type === "chart": minimal bar rendering — kept dependency-free rather
  // than pulling in a full charting lib for a first version of AI artifacts.
  const data = artifact.data as { points: { label: string; value: number }[] };
  const max = Math.max(...data.points.map((p) => p.value), 1);
  return (
    <div className="space-y-2">
      {data.points.map((p) => (
        <div key={p.label}>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-mv-ink-soft">{p.label}</span>
            <span className="font-semibold text-mv-ink">{p.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-mv-cream-soft">
            <div
              className="h-full rounded-full bg-mv-green"
              style={{ width: `${(p.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
