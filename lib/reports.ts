import { programs, serviceDays, inflows, outflows, campaigns, kpis } from "@/lib/mock-data";

export type ReportKind = "trend" | "breakdown";

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

function combinedDaily() {
  const map = new Map<string, number>();
  for (const p of programs) {
    for (const d of p.dailyRevenue) {
      map.set(d.date, (map.get(d.date) ?? 0) + d.revenue);
    }
  }
  return Array.from(map.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const revenueTrend = combinedDaily();
export const margeTrend = revenueTrend.map((d) => ({ date: d.date, revenue: Math.round(d.revenue * 0.524) }));
export const joursTrend = [...serviceDays]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((d) => ({ date: d.date, revenue: d.revenue }));

export const reports: ReportDef[] = [
  {
    slug: "revenu",
    label: "Revenu total",
    group: "Revenue",
    kind: "trend",
    unit: "currency",
    color: "var(--mv-green)",
    value: kpis.totalRevenue,
    delta: kpis.totalRevenueDelta,
    summary:
      "Le revenu combine tous les programmes actifs sur la période. La terrasse d'été et le brunch du dimanche portent l'essentiel de la croissance, avec un pic net les week-ends.",
  },
  {
    slug: "marge",
    label: "Marge estimée",
    group: "Revenue",
    kind: "trend",
    unit: "currency",
    color: "var(--mv-lime-dark)",
    value: kpis.estimatedMargin,
    delta: kpis.estimatedMarginDelta,
    summary:
      "La marge estimée suit le revenu à un taux moyen de 52%. Les soirées à thème et les événements privés tirent la marge vers le haut ; la livraison la tire vers le bas.",
  },
  {
    slug: "journees",
    label: "Journées de service",
    group: "Service",
    kind: "trend",
    unit: "count",
    color: "var(--mv-amber)",
    value: kpis.serviceDaysCount,
    summary:
      "31 journées de service ce mois-ci. Deux anomalies notables : un rush le 10 juillet (Soirée Jazz) et un creux le 8 juillet (météo).",
  },
  {
    slug: "entrees",
    label: "Entrées de revenu",
    group: "Finance",
    kind: "breakdown",
    unit: "currency",
    color: "var(--mv-green)",
    value: inflows.reduce((s, l) => s + l.amount, 0),
    summary: "Les ventes en salle restent la première source d'entrée, loin devant la livraison et les réservations en ligne.",
  },
  {
    slug: "sorties",
    label: "Sorties de charges",
    group: "Finance",
    kind: "breakdown",
    unit: "currency",
    color: "var(--mv-ink-soft)",
    value: outflows.reduce((s, l) => s + l.amount, 0),
    summary: "Le personnel et les fournisseurs représentent 72% des sorties. Le marketing reste une part mineure du budget.",
  },
  {
    slug: "campagnes",
    label: "Campagnes actives",
    group: "Campagnes",
    kind: "count",
    unit: "count",
    color: "var(--mv-red)",
    value: kpis.activeCampaigns,
    summary: "4 campagnes actives ce mois-ci, tous canaux confondus. La campagne terrasse d'été affiche le meilleur impact revenu.",
  },
];

export function getReport(slug: string) {
  return reports.find((r) => r.slug === slug);
}

export function trendFor(slug: string) {
  if (slug === "revenu") return revenueTrend;
  if (slug === "marge") return margeTrend;
  if (slug === "journees") return joursTrend;
  return [];
}

export function breakdownFor(slug: string) {
  if (slug === "entrees") return inflows;
  if (slug === "sorties") return outflows;
  return [];
}

export const reportGroups = ["Revenue", "Service", "Finance", "Campagnes"] as const;

export function campaignsForReport() {
  return campaigns;
}
