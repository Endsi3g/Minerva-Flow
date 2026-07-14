"use client";

import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, Trash2, Edit2, Share2, Clock, Check, BarChart2, Table as TableIcon, FileSpreadsheet, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteReportAction, renameReportAction } from "@/app/(app)/reports/actions";
import { getGoogleWorkspaceStatusAction } from "@/app/(app)/settings/google-workspace-actions";
import { GOOGLE_SCOPES } from "@/lib/google/config";
import googleBrand from "thesvg/google";

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

const unitFormat: Record<string, (v: number) => string> = {
  currency: formatCurrency,
  percent: (v) => `${v}%`,
  count: (v) => String(v),
};

export function DynamicReportView({
  reportId,
  initialTitle,
  type,
  data: rawData,
  createdAt,
}: {
  reportId: string;
  initialTitle: string;
  type: string;
  data: any;
  createdAt: string;
}) {
  const router = useRouter();
  const { restaurantId } = useApp();
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(initialTitle);
  const [tab, setTab] = useState<"visual" | "data">("visual");
  const [sheetsEnabled, setSheetsEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!restaurantId) return;
    getGoogleWorkspaceStatusAction(restaurantId).then(({ connection }) => {
      setSheetsEnabled(Boolean(connection?.grantedScopes.includes(GOOGLE_SCOPES.sheets)));
    });
  }, [restaurantId]);

  async function handleDelete() {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) return;
    startTransition(async () => {
      const ok = await deleteReportAction(reportId);
      if (ok) {
        toast.success("Rapport supprimé.");
        router.push("/reports");
        router.refresh();
      } else {
        toast.error("Impossible de supprimer le rapport.");
      }
    });
  }

  async function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editVal.trim() || editVal === title) {
      setEditing(false);
      return;
    }
    const next = editVal.trim();
    startTransition(async () => {
      const ok = await renameReportAction(reportId, next);
      if (ok) {
        setTitle(next);
        setEditing(false);
        toast.success("Rapport renommé.");
        router.refresh();
      } else {
        toast.error("Impossible de renommer le rapport.");
      }
    });
  }

  // Basic sheets export for custom table/charts
  async function handleExport() {
    toast.error("Fonctionnalité d'exportation personnalisée en cours d'activation.");
  }

  const wide = type === "comparison";

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header breadcrumbs & actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-mv-border/40 pb-4">
        <div className="flex items-center gap-1.5 text-[13px] text-mv-ink-faint">
          <Link href="/reports" className="flex items-center gap-1 hover:text-mv-ink transition-colors">
            <ChevronLeft size={14} /> Rapports
          </Link>
          <span>/</span>
          <span className="text-mv-ink-soft font-medium truncate max-w-[200px]">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5">
              <input
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                className="rounded-lg border border-mv-border bg-mv-surface px-2.5 py-1 text-[13px] focus:outline-none focus:border-mv-green-dark"
                autoFocus
              />
              <Button type="submit" size="sm" disabled={isPending}>
                Enregistrer
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </form>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Edit2 size={13} className="mr-1.5" /> Renommer
            </Button>
          )}

          {sheetsEnabled && (
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : (
                <div
                  className="h-3.5 w-3.5 mr-1.5 flex items-center justify-center fill-current"
                  dangerouslySetInnerHTML={{ __html: googleBrand.svg }}
                />
              )}
              Exporter
            </Button>
          )}

          <Button size="sm" variant="secondary" className="hover:bg-mv-red-bg hover:text-mv-red" onClick={handleDelete} disabled={isPending}>
            <Trash2 size={13} className="mr-1.5" /> Supprimer
          </Button>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="mb-6">
        <h1 className="font-display text-[30px] font-bold text-mv-ink tracking-tight mb-2">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-mv-ink-faint">
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> Créé le {new Date(createdAt).toLocaleDateString("fr-CA", { dateStyle: "long" })}
          </span>
          <span className="bg-mv-green-tint text-mv-green-dark border border-mv-green/10 px-2 py-0.5 rounded-full text-[11px] font-semibold">
            Rapport Dynamique AI
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      {(type === "comparison" || type === "chart") && (
        <div className="flex border border-mv-border/60 bg-mv-cream-soft rounded-lg mb-6 p-0.5 w-fit shadow-mv-sm">
          <button
            onClick={() => setTab("visual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
              tab === "visual" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink"
            }`}
          >
            <BarChart2 size={13} /> Rapport Visuel
          </button>
          <button
            onClick={() => setTab("data")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
              tab === "data" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink"
            }`}
          >
            <TableIcon size={13} /> Données de base
          </button>
        </div>
      )}

      {/* Body content */}
      <div className="mt-4">
        {tab === "visual" ? (
          <DynamicArtifactBody type={type} data={rawData} />
        ) : (
          <DynamicArtifactRawData type={type} data={rawData} />
        )}
      </div>
    </div>
  );
}

function DynamicArtifactBody({ type, data }: { type: string; data: any }) {
  if (type === "summary") {
    return (
      <div className="bg-mv-surface border border-mv-border/60 p-6 rounded-2xl shadow-mv-sm">
        <p className="text-[14.5px] leading-relaxed text-mv-ink-soft whitespace-pre-wrap">{data.text}</p>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-mv-surface border border-mv-border/60 rounded-2xl shadow-mv-sm overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-mv-border/80 bg-mv-cream-soft text-left font-semibold text-mv-ink-faint">
              {data.columns.map((col: string) => (
                <th key={col} className="px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any[], i: number) => (
              <tr key={i} className="border-b border-mv-border-soft last:border-0 hover:bg-mv-cream-soft/40 transition-colors">
                {row.map((cell: any, j: number) => (
                  <td key={j} className="px-4 py-3 text-mv-ink font-medium">
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

  if (type === "comparison") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.charts.map((chart: any) => (
            <Card key={chart.title} className="p-5">
              <p className="mb-3 text-[13.5px] font-semibold text-mv-ink">{chart.title}</p>
              <DualLineChart seriesA={chart.seriesA} seriesB={chart.seriesB} />
            </Card>
          ))}
        </div>

        {data.metrics.length > 0 && (
          <Card className="p-5">
            <p className="mb-3.5 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Indicateurs clés
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.metrics.map((m: any) => (
                <div key={m.label} className="border border-mv-border-soft rounded-xl p-4 bg-mv-cream-soft/20 flex flex-col justify-between">
                  <span className="text-[12px] text-mv-ink-soft font-medium">{m.label}</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[20px] font-bold text-mv-ink">
                      {unitFormat[m.unit](m.value)}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-[12px] font-bold ${
                        m.momDelta >= 0 ? "text-mv-green-dark" : "text-mv-red"
                      }`}
                    >
                      {m.momDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(m.momDelta).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.prediction && (
          <Card className="p-5">
            <p className="mb-3 text-[13.5px] font-semibold text-mv-ink">
              {data.prediction.label}{" "}
              <span className="font-normal text-mv-ink-faint">(estimation)</span>
            </p>
            <MiniLineChart data={data.prediction.points} color="var(--mv-amber)" />
          </Card>
        )}

        {data.summary.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Analyse &amp; Synthèse
            </p>
            <ul className="space-y-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
              {data.summary.map((line: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="text-mv-green font-bold">•</span> {line}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  // single series chart
  return (
    <Card className="p-6">
      <ResponsiveContainer width="100%" height={Math.max(160, data.points.length * 36)}>
        <BarChart data={data.points} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "var(--mv-ink-soft)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={100}
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
    </Card>
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
      <ResponsiveContainer width="100%" height={180}>
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
      <div className="mt-2 flex gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 text-mv-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-mv-green" /> {seriesA.label}
        </span>
        <span className="flex items-center gap-1.5 text-mv-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-mv-amber" /> {seriesB.label}
        </span>
      </div>
    </div>
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

function DynamicArtifactRawData({ type, data }: { type: string; data: any }) {
  if (type === "chart") {
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
            {data.points.map((p: any, i: number) => (
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

  if (type === "comparison") {
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
            {data.metrics.map((m: any, i: number) => (
              <tr key={i} className="border-b border-mv-border-soft last:border-0">
                <td className="px-3 py-2 text-mv-ink font-medium">{m.label}</td>
                <td className="px-3 py-2 text-right text-mv-ink font-semibold">
                  {unitFormat[m.unit](m.value)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold text-[11.5px] ${
                    m.momDelta >= 0 ? "text-mv-green-dark" : "text-mv-red"
                  }`}
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
