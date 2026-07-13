import type { Campaign, FinancialTransaction, FlowLine, Program, ServiceDay } from "@/lib/types";

export type ReportKind = "trend" | "breakdown" | "count";

export type ReportDef = {
  slug: string;
  label: string;
  group: "Revenue" | "Service" | "Finance" | "Campagnes";
  kind: ReportKind;
  unit: "currency" | "count";
  color: string;
  value: number;
  delta?: number;
  summary: string;
};

export type ReportData = {
  serviceDays: ServiceDay[];
  programs: Program[];
  campaigns: Campaign[];
  financialTransactions: FinancialTransaction[];
};

export const reportGroups = ["Revenue", "Service", "Finance", "Campagnes"] as const;

export type ReportMeta = Pick<ReportDef, "slug" | "label" | "group" | "kind" | "unit" | "color">;

/**
 * Static report metadata (slug/label/group/color) that doesn't depend on
 * live data — safe to import in nav/breadcrumb components that only need
 * to list or label reports, without fetching restaurant data.
 */
export const reportDefs: ReportMeta[] = [
  { slug: "revenu", label: "Revenu total", group: "Revenue", kind: "trend", unit: "currency", color: "var(--mv-green)" },
  { slug: "marge", label: "Marge estimée", group: "Revenue", kind: "trend", unit: "currency", color: "var(--mv-lime-dark)" },
  { slug: "journees", label: "Journées de service", group: "Service", kind: "trend", unit: "count", color: "var(--mv-amber)" },
  { slug: "entrees", label: "Entrées de revenu", group: "Finance", kind: "breakdown", unit: "currency", color: "var(--mv-green)" },
  { slug: "sorties", label: "Sorties de charges", group: "Finance", kind: "breakdown", unit: "currency", color: "var(--mv-ink-soft)" },
  { slug: "campagnes", label: "Campagnes actives", group: "Campagnes", kind: "count", unit: "count", color: "var(--mv-red)" },
];

function sortedByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

/** Percentage change between the second half and the first half of a series. */
function trendDelta(series: { revenue: number }[]): number | undefined {
  if (series.length < 4) return undefined;
  const mid = Math.floor(series.length / 2);
  const first = series.slice(0, mid);
  const second = series.slice(mid);
  const sum = (xs: { revenue: number }[]) => xs.reduce((s, x) => s + x.revenue, 0);
  const firstSum = sum(first);
  const secondSum = sum(second);
  if (firstSum === 0) return undefined;
  return Math.round(((secondSum - firstSum) / firstSum) * 1000) / 10;
}

export function revenueTrend(data: ReportData) {
  return sortedByDate(data.serviceDays).map((d) => ({ date: d.date, revenue: d.revenue }));
}

export function margeTrend(data: ReportData) {
  return sortedByDate(data.serviceDays).map((d) => ({
    date: d.date,
    revenue:
      d.expenses !== undefined ? Math.max(0, d.revenue - d.expenses) : Math.round(d.revenue * 0.524),
  }));
}

export function joursTrend(data: ReportData) {
  return sortedByDate(data.serviceDays).map((d) => ({ date: d.date, revenue: d.revenue }));
}

function inflows(data: ReportData): FlowLine[] {
  return breakdownByCategory(data.financialTransactions, "in");
}

function outflows(data: ReportData): FlowLine[] {
  return breakdownByCategory(data.financialTransactions, "out");
}

function breakdownByCategory(
  transactions: FinancialTransaction[],
  direction: "in" | "out"
): FlowLine[] {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== direction) continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const total = Array.from(byCategory.values()).reduce((s, v) => s + v, 0);
  return Array.from(byCategory.entries())
    .map(([label, amount]) => ({
      label,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildReports(data: ReportData): ReportDef[] {
  const revTrend = revenueTrend(data);
  const totalRevenue = revTrend.reduce((s, d) => s + d.revenue, 0);
  const margTrend = margeTrend(data);
  const totalMargin = margTrend.reduce((s, d) => s + d.revenue, 0);
  const inflowLines = inflows(data);
  const outflowLines = outflows(data);
  const activeCampaigns = data.campaigns.filter((c) => c.status === "active");

  return [
    {
      slug: "revenu",
      label: "Revenu total",
      group: "Revenue",
      kind: "trend",
      unit: "currency",
      color: "var(--mv-green)",
      value: totalRevenue,
      delta: trendDelta(revTrend),
      summary:
        "Le revenu combine toutes les journées de service saisies sur la période, tous programmes confondus.",
    },
    {
      slug: "marge",
      label: "Marge estimée",
      group: "Revenue",
      kind: "trend",
      unit: "currency",
      color: "var(--mv-lime-dark)",
      value: totalMargin,
      delta: trendDelta(margTrend),
      summary:
        "La marge estimée soustrait les dépenses de service saisies (ou, à défaut, un taux moyen de 52,4%) du revenu quotidien.",
    },
    {
      slug: "journees",
      label: "Journées de service",
      group: "Service",
      kind: "trend",
      unit: "count",
      color: "var(--mv-amber)",
      value: data.serviceDays.length,
      summary: `${data.serviceDays.length} journée${data.serviceDays.length > 1 ? "s" : ""} de service saisie${data.serviceDays.length > 1 ? "s" : ""} sur la période.`,
    },
    {
      slug: "entrees",
      label: "Entrées de revenu",
      group: "Finance",
      kind: "breakdown",
      unit: "currency",
      color: "var(--mv-green)",
      value: inflowLines.reduce((s, l) => s + l.amount, 0),
      summary: "Répartition des entrées financières enregistrées, par catégorie.",
    },
    {
      slug: "sorties",
      label: "Sorties de charges",
      group: "Finance",
      kind: "breakdown",
      unit: "currency",
      color: "var(--mv-ink-soft)",
      value: outflowLines.reduce((s, l) => s + l.amount, 0),
      summary: "Répartition des sorties financières enregistrées, par catégorie.",
    },
    {
      slug: "campagnes",
      label: "Campagnes actives",
      group: "Campagnes",
      kind: "count",
      unit: "count",
      color: "var(--mv-red)",
      value: activeCampaigns.length,
      summary: `${activeCampaigns.length} campagne${activeCampaigns.length > 1 ? "s" : ""} active${activeCampaigns.length > 1 ? "s" : ""} ce mois-ci, tous canaux confondus.`,
    },
  ];
}

export function getReport(slug: string, data: ReportData): ReportDef | undefined {
  return buildReports(data).find((r) => r.slug === slug);
}

export function trendFor(slug: string, data: ReportData) {
  if (slug === "revenu") return revenueTrend(data);
  if (slug === "marge") return margeTrend(data);
  if (slug === "journees") return joursTrend(data);
  return [];
}

export function breakdownFor(slug: string, data: ReportData): FlowLine[] {
  if (slug === "entrees") return inflows(data);
  if (slug === "sorties") return outflows(data);
  return [];
}

export function campaignsForReport(data: ReportData): Campaign[] {
  return data.campaigns;
}
