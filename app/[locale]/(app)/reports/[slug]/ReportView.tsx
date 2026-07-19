"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CurrentUserAvatar } from "@/components/minerva/CurrentUserAvatar";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { FlowBars } from "@/components/charts/FlowBars";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { Field, Input } from "@/components/minerva/FormField";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useApp, useCurrentRestaurant } from "@/lib/app-context";
import type { ReportDef } from "@/lib/reports";
import type { Campaign, FlowLine } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  Star,
  Filter,
  Share2,
  Clock,
  Store,
  Plus,
  FileSpreadsheet,
  Loader2,
  Check,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { exportReportAction, getReportDataAction, shareReportAction } from "@/app/[locale]/(app)/reports/actions";
import { getGoogleWorkspaceStatusAction } from "@/app/[locale]/(app)/settings/google-workspace-actions";
import { GOOGLE_SCOPES } from "@/lib/google/config";

const periodLabel: Record<string, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois-ci",
  custom: "Personnalisé",
};

export function ReportView({
  report,
  trend,
  breakdown,
  campaigns,
}: {
  report: ReportDef;
  trend: { date: string; revenue: number }[];
  breakdown: FlowLine[];
  campaigns: Campaign[];
}) {
  const { period, restaurantId } = useApp();
  const restaurant = useCurrentRestaurant();
  const [starred, setStarred] = useState(false);
  const [sheetsEnabled, setSheetsEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState({ report, trend, breakdown });
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [filtering, setFiltering] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getGoogleWorkspaceStatusAction(restaurantId).then(({ connection }) => {
      setSheetsEnabled(Boolean(connection?.grantedScopes.includes(GOOGLE_SCOPES.sheets)));
    });
  }, [restaurantId]);

  async function handleExport() {
    setExporting(true);
    try {
      const url = await exportReportAction(view.report.slug);
      if (url) {
        toast.success("Rapport exporté vers Google Sheets.", {
          action: { label: "Ouvrir", onClick: () => window.open(url, "_blank") },
        });
      } else {
        toast.error("L'export a échoué — réessayez.");
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleApplyFilter() {
    if (!fromDraft || !toDraft) return;
    setFiltering(true);
    try {
      const result = await getReportDataAction(report.slug, { from: fromDraft, to: toDraft });
      if (result) {
        setView(result);
        setRange({ from: fromDraft, to: toDraft });
        setFilterOpen(false);
      } else {
        toast.error("Impossible d'appliquer ce filtre.");
      }
    } finally {
      setFiltering(false);
    }
  }

  function handleResetFilter() {
    setView({ report, trend, breakdown });
    setRange(null);
    setFromDraft("");
    setToDraft("");
    setFilterOpen(false);
  }

  async function handleShareOpenChange(next: boolean) {
    setShareOpen(next);
    if (!next || shareLink) return;
    setSharing(true);
    try {
      const token = await shareReportAction(report.slug, range ?? undefined);
      setShareLink(token ? `${window.location.origin}/r/${token}` : null);
      if (!token) toast.error("Impossible de générer le lien de partage.");
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyShareLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl w-full mv-animate-in">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] text-mv-ink-faint">
          <Link href="/overview" className="flex items-center gap-1 hover:text-mv-ink">
            <ChevronLeft size={14} /> Reports
          </Link>
          <span>/</span>
          <button
            onClick={() => setStarred((v) => !v)}
            className="flex items-center gap-1.5 hover:text-mv-ink"
          >
            <Star
              size={13}
              className={starred ? "fill-mv-lime-dark text-mv-lime-dark" : ""}
            />
            {view.report.label}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <CurrentUserAvatar size={26} className="ring-2 ring-mv-cream" />

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger
              render={
                <Button size="sm" variant={range ? "primary" : "secondary"}>
                  <Filter size={14} /> {range ? "Filtré" : "Filter"}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-72">
              <p className="text-[12.5px] font-semibold text-mv-ink">Filtrer par période</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Du">
                  <Input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)} />
                </Field>
                <Field label="Au">
                  <Input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)} />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {range && (
                  <Button size="sm" variant="ghost" onClick={handleResetFilter}>
                    Réinitialiser
                  </Button>
                )}
                <Button size="sm" onClick={handleApplyFilter} disabled={!fromDraft || !toDraft || filtering}>
                  {filtering ? "Application…" : "Appliquer"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {sheetsEnabled && (
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Exporter vers Sheets
            </Button>
          )}

          <Popover open={shareOpen} onOpenChange={handleShareOpenChange}>
            <PopoverTrigger
              render={
                <Button size="sm" variant="secondary">
                  <Share2 size={14} /> Share
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80">
              <p className="text-[12.5px] font-semibold text-mv-ink">Lien public en lecture seule</p>
              {sharing ? (
                <p className="text-[12.5px] text-mv-ink-faint">Génération…</p>
              ) : shareLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-2.5 py-2">
                    <p className="flex-1 truncate text-[12px] text-mv-ink-soft">{shareLink}</p>
                    <button
                      onClick={handleCopyShareLink}
                      aria-label="Copier le lien"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                    >
                      {copied ? <Check size={13} className="text-mv-green-dark" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="text-[11.5px] text-mv-ink-faint">
                    Un instantané des chiffres actuels, consultable sans connexion.
                  </p>
                </div>
              ) : (
                <p className="text-[12.5px] text-mv-red">Échec de la génération du lien.</p>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <button
        onClick={() => setStarred((v) => !v)}
        className="mb-3"
        aria-label="Marquer comme favori"
      >
        <Star
          size={26}
          className={starred ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"}
        />
      </button>

      <h1 className="mb-5 font-display text-[32px] font-medium tracking-tight text-mv-ink">
        {view.report.label}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft">
          <Clock size={13} /> {periodLabel[period]}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft">
          <Store size={13} /> {restaurant.name}
        </span>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-mv-border text-mv-ink-faint hover:text-mv-ink">
          <Plus size={14} />
        </button>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 font-display text-[18px] font-medium text-mv-ink">
          Résumé
        </h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-mv-ink-soft">
          {view.report.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl border-2 border-mv-green bg-mv-surface p-5 shadow-mv-md">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {view.report.label}
            </p>
            <p className="mt-1 text-[11.5px] text-mv-ink-faint">
              {range ? `${formatDate(range.from)} — ${formatDate(range.to)}` : periodLabel[period]}
            </p>
            <p className="mt-4 font-display text-[42px] font-medium leading-none text-mv-ink">
              {view.report.unit === "currency" ? formatCurrency(view.report.value) : view.report.value}
            </p>
            {view.report.delta !== undefined && (
              <Badge tone={view.report.delta >= 0 ? "green" : "red"} className="mt-3">
                {view.report.delta >= 0 ? "↑" : "↓"} {Math.abs(view.report.delta).toFixed(1)}% vs période précédente
              </Badge>
            )}
            {view.trend.length > 0 && (
              <div className="mt-4">
                <RevenueChart data={view.trend} height={140} />
              </div>
            )}
            <div className="absolute -bottom-3 -left-3">
              <CurrentUserAvatar size={30} className="ring-2 ring-mv-cream shadow-mv-sm" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          {view.breakdown.length > 0 ? (
            <Card className="h-full">
              <CardHeader title="Répartition" description="Sur la période sélectionnée" />
              <FlowBars lines={view.breakdown} tone={view.report.slug === "sorties" ? "ink" : "green"} />
            </Card>
          ) : campaigns.length > 0 ? (
            <Card className="h-full">
              <CardHeader title="Campagnes" description={`${campaigns.length} au total`} />
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-mv-ink">{c.name}</p>
                      <p className="text-[11.5px] text-mv-ink-faint">{c.channel}</p>
                    </div>
                    <Badge tone="neutral">{formatCurrency(c.estimatedRevenue)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader title="Détail" description="Journées marquantes de la période" />
              <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                Le pic du 10 juillet correspond à la Soirée Jazz ; le creux du 8 juillet est lié à
                la météo. Voir la page{" "}
                <Link href="/days" className="text-mv-green-dark underline underline-offset-2">
                  Days
                </Link>{" "}
                pour le détail jour par jour.
              </p>
            </Card>
          )}
        </div>
      </div>

      {view.report.kind === "trend" && view.trend.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader
              eyebrow="Détail"
              title={`${view.report.label} — jour par jour`}
              description="Chaque point correspond à une journée de service"
            />
            <Table>
              <THead>
                <Th>Date</Th>
                <Th className="text-right">Valeur</Th>
              </THead>
              <tbody>
                {[...view.trend]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 8)
                  .map((d) => (
                    <Tr key={d.date}>
                      <Td>{formatDate(d.date)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(d.revenue)}</Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
