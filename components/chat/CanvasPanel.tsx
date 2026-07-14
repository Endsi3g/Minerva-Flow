"use client";

import { CanvasDefaultContext } from "@/components/chat/CanvasDefaultContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ChatArtifact } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
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
export function CanvasPanel({ artifact }: { artifact: ChatArtifact | null }) {
  const wide = artifact?.type === "comparison";

  if (!artifact) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-mv-border-soft lg:block">
        <CanvasDefaultContext />
      </aside>
    );
  }

  return (
    <aside
      className={`hidden shrink-0 overflow-y-auto border-l border-mv-border-soft p-5 lg:block ${wide ? "w-[26rem]" : "w-80"}`}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {artifact.title}
      </p>
      <ArtifactBody artifact={artifact} />
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
