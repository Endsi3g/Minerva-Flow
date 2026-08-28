"use client";

import { Sparkles, FileText, Table as TableIcon, TrendingUp, ArrowUpRight } from "lucide-react";
import type { ChatArtifact } from "@/lib/types";

export function ToolArtifactCard({
  artifact,
  onOpenCanvas,
}: {
  artifact: ChatArtifact;
  onOpenCanvas?: () => void;
}) {
  const isChart = artifact.type === "chart" || artifact.type === "comparison";
  const isTable = artifact.type === "table";

  return (
    <div className="my-2.5 rounded-2xl border border-mv-green/30 bg-mv-green-tint/30 p-3.5 shadow-mv-sm transition-all hover:border-mv-green/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
            {isChart ? <TrendingUp size={16} /> : isTable ? <TableIcon size={16} /> : <FileText size={16} />}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mv-green-dark">
              Rapport Canvas Généré
            </span>
            <p className="truncate text-[13.5px] font-bold text-mv-ink">{artifact.title}</p>
          </div>
        </div>

        {onOpenCanvas && (
          <button
            type="button"
            onClick={onOpenCanvas}
            className="flex items-center gap-1 rounded-lg border border-mv-green/30 bg-mv-surface px-2.5 py-1.5 text-xs font-bold text-mv-green-dark shadow-mv-sm hover:bg-mv-green-tint transition-all"
          >
            <span>Canvas</span>
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
