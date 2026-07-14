"use client";

import { CanvasDefaultContext, type CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ChatArtifact } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, X, Plus, Loader2, BarChart2, Table as TableIcon, Check } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { publishReportAction } from "@/app/(app)/reports/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { date: string; value: number };

/**
 * Right-hand Canvas panel: renders the latest artifact for the active
 * conversation, or the default KPI/alerts/programs context if none exists
 * yet.
 */
export function CanvasPanel({
  artifact,
  defaultContext,
  onClose,
}: {
  artifact: ChatArtifact | null;
  defaultContext: CanvasContextData;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<"visual" | "data">("visual");
  const [isPending, startTransition] = useTransition();
  const [published, setPublished] = useState(false);
  const router = useRouter();

  // Reset published status when artifact changes
  useEffect(() => {
    setPublished(Boolean(artifact?.data && (artifact.data as any).isPublished));
    setTab("visual");
  }, [artifact]);

  if (!artifact) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-mv-border-soft lg:block">
        <CanvasDefaultContext data={defaultContext} />
      </aside>
    );
  }

  const wide = artifact.type === "comparison";

  async function handlePublish() {
    if (!artifact) return;
    startTransition(async () => {
      const res = await publishReportAction(
        artifact.conversationId,
        artifact.title,
        artifact.type,
        artifact.data
      );
      if (res.success) {
        setPublished(true);
        toast.success("Rapport créé avec succès !", {
          action: {
            label: "Voir les rapports",
            onClick: () => router.push("/reports"),
          },
        });
        router.refresh();
      } else {
        toast.error("Impossible de créer le rapport.");
      }
    });
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-mv-cream-soft p-5 border-l border-mv-border-soft overflow-hidden w-full",
        wide ? "lg:w-[28rem]" : "lg:w-80"
      )}
    >
      {/* Canvas Header */}
      <div className="flex items-center justify-between border-b border-mv-border/40 pb-3 mb-3 shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="font-display text-[14.5px] font-semibold text-mv-ink truncate">
            {artifact.title}
          </h3>
          <p className="text-[10.5px] text-mv-ink-faint">Rapport d&apos;analyse IA</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!published ? (
            <Button
              size="xs"
              onClick={handlePublish}
              disabled={isPending}
              className="h-6.5 text-[11px] px-2 bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark"
            >
              {isPending ? (
                <Loader2 size={11} className="animate-spin mr-1" />
              ) : (
                <Plus size={11} className="mr-1" />
              )}
              Créer un rapport
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-mv-green-dark bg-mv-green-tint px-2 py-0.5 rounded-full border border-mv-green/20">
              <Check size={10} /> Enregistré
            </span>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs selectors (only for chart or comparison) */}
      {(artifact.type === "comparison" || artifact.type === "chart") && (
        <div className="flex border border-mv-border/60 bg-mv-cream-soft rounded-lg mb-4 p-0.5 w-fit shrink-0 shadow-mv-sm">
          <button
            onClick={() => setTab("visual")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
              tab === "visual" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint"
            )}
          >
            <BarChart2 size={12} /> Rapport
          </button>
          <button
            onClick={() => setTab("data")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
              tab === "data" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint"
            )}
          >
            <TableIcon size={12} /> Données
          </button>
        </div>
      )}

      {/* Canvas Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "visual" ? (
          <ArtifactBody artifact={artifact} />
        ) : (
          <ArtifactRawData artifact={artifact} />
        )}
      </div>
    </aside>
  );
}

function MiniLineChart({ data, color = "var(--mv-green)" }: { data: TrendPoint[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 10 }}
          axisLine={{ stroke: "var(--mv-border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis hide />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(v) => formatDate(String(v))}
          contentStyle={{
            background: "var(--mv-surface)",
            border: "1px solid var(--mv-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DualLineChart({
  seriesA,
  seriesB,
}: {
  seriesA: { label: string; points: TrendPoint[] };
  seriesB: { label: string; points: TrendPoint[] };
}) {
  const map = new Map<string, { date: string; a?: number; b?: number }>();
  for (const p of seriesA.points) map.set(p.date, { ...map.get(p.date), date: p.date, a: p.value });
  for (const p of seriesB.points) map.set(p.date, { ...(map.get(p.date) ?? { date: p.date }), b: p.value });
  const data = Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date));

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fill: "var(--mv-ink-faint)", fontSize: 10 }}
            axisLine={{ stroke: "var(--mv-border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--mv-surface)",
              border: "1px solid var(--mv-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => formatDate(String(v))}
          />
          <Line type="monotone" dataKey="a" name={seriesA.label} stroke="var(--mv-green)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="b" name={seriesB.label} stroke="var(--mv-amber)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 text-mv-ink-soft">
          <span className="h-2 w-2 rounded-full bg-mv-green" /> {seriesA.label}
        </span>
        <span className="flex items-center gap-1.5 text-mv-ink-soft">
          <span className="h-2 w-2 rounded-full bg-mv-amber" /> {seriesB.label}
        </span>
      </div>
    </div>
  );
}

const unitFormat: Record<string, (v: number) => string> = {
  currency: formatCurrency,
  percent: (v) => `${v}%`,
  count: (v) => String(v),
};

function MetricRow({
  metric,
}: {
  metric: { label: string; value: number; unit: "currency" | "percent" | "count"; momDelta: number; reportSlug?: string };
}) {
  const content = (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-mv-cream-soft">
      <span className="text-[12.5px] text-mv-ink-soft">{metric.label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-mv-ink">
          {unitFormat[metric.unit](metric.value)}
        </span>
        <span
          className={`flex items-center gap-0.5 text-[11px] font-semibold ${metric.momDelta >= 0 ? "text-mv-green-dark" : "text-mv-red"}`}
        >
          {metric.momDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(metric.momDelta).toFixed(1)}%
        </span>
        {metric.reportSlug && <ArrowRight size={12} className="text-mv-ink-faint" />}
      </div>
    </div>
  );

  if (!metric.reportSlug) return content;
  return (
    <Link href={`/reports/${metric.reportSlug}`} className="block">
      {content}
    </Link>
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

  if (artifact.type === "comparison") {
    const data = artifact.data as {
      charts: { title: string; seriesA: { label: string; points: TrendPoint[] }; seriesB: { label: string; points: TrendPoint[] } }[];
      metrics: { label: string; value: number; unit: "currency" | "percent" | "count"; momDelta: number; reportSlug?: string }[];
      summary: string[];
      prediction?: { label: string; points: TrendPoint[]; method: "trend" };
    };

    return (
      <div className="space-y-5">
        {data.charts.map((chart) => (
          <div key={chart.title}>
            <p className="mb-1.5 text-[12px] font-semibold text-mv-ink">{chart.title}</p>
            <DualLineChart seriesA={chart.seriesA} seriesB={chart.seriesB} />
          </div>
        ))}

        {data.metrics.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Key metrics
            </p>
            <div className="space-y-0.5 rounded-lg border border-mv-border-soft">
              {data.metrics.map((m) => (
                <MetricRow key={m.label} metric={m} />
              ))}
            </div>
          </div>
        )}

        {data.prediction && (
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-mv-ink">
              {data.prediction.label}{" "}
              <span className="font-normal text-mv-ink-faint">(estimation)</span>
            </p>
            <MiniLineChart data={data.prediction.points} color="var(--mv-amber)" />
          </div>
        )}

        {data.summary.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Résumé
            </p>
            <ul className="space-y-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
              {data.summary.map((line, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-mv-ink-faint">•</span> {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // type === "chart": single-series categorical comparison, via recharts.
  const data = artifact.data as { points: { label: string; value: number }[] };
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.points.length * 32)}>
      <BarChart data={data.points} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--mv-ink-soft)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          contentStyle={{
            background: "var(--mv-surface)",
            border: "1px solid var(--mv-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill="var(--mv-green)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ArtifactRawData({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.type === "chart") {
    const data = artifact.data as { points: { label: string; value: number }[] };
    return (
      <div className="overflow-hidden rounded-lg border border-mv-border-soft bg-mv-surface">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-mv-border-soft bg-mv-cream-soft text-left font-semibold text-mv-ink-faint">
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2 text-right">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.points.map((p, i) => (
              <tr key={i} className="border-b border-mv-border-soft last:border-0">
                <td className="px-3 py-2 text-mv-ink font-medium">{p.label}</td>
                <td className="px-3 py-2 text-right text-mv-ink font-semibold">{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (artifact.type === "comparison") {
    const data = artifact.data as {
      metrics: { label: string; value: number; unit: "currency" | "percent" | "count"; momDelta: number }[];
    };
    return (
      <div className="overflow-hidden rounded-lg border border-mv-border-soft bg-mv-surface">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-mv-border-soft bg-mv-cream-soft text-left font-semibold text-mv-ink-faint">
              <th className="px-3 py-2">Métrique</th>
              <th className="px-3 py-2 text-right">Valeur</th>
              <th className="px-3 py-2 text-right">Variation MoM</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m, i) => (
              <tr key={i} className="border-b border-mv-border-soft last:border-0">
                <td className="px-3 py-2 text-mv-ink font-medium">{m.label}</td>
                <td className="px-3 py-2 text-right text-mv-ink font-semibold">
                  {unitFormat[m.unit](m.value)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold text-[11.5px]",
                    m.momDelta >= 0 ? "text-mv-green-dark" : "text-mv-red"
                  )}
                >
                  {m.momDelta >= 0 ? "+" : ""}
                  {m.momDelta.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="text-[12.5px] text-mv-ink-faint">Aucune donnée brute disponible.</p>;
}
