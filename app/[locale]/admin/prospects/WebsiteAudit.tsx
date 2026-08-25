"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScanSearch, CircleCheck, CircleX, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { runProspectAuditAction, runEnrichedProspectAuditAction } from "./actions";
import type { AuditCheckId, WebsiteAuditReport } from "@/lib/prospects/types";
import type { EnrichedAuditResult } from "@/lib/prospects/audit/ai-audit";

const CHECK_ORDER: AuditCheckId[] = [
  "onlineMenu",
  "onlineOrdering",
  "onlineReservation",
  "speed",
  "mobileViewport",
  "seoBasics",
  "https",
  "clickablePhone",
  "socialLinks",
];

const GRADE_TONE = {
  A: "green",
  B: "lime",
  C: "amber",
  D: "red",
} as const;

export function WebsiteAudit({
  prospectId,
  sourceUrl,
  initialReport,
  initialGeneratedAt,
}: {
  prospectId: string;
  sourceUrl: string;
  initialReport: WebsiteAuditReport | null;
  initialGeneratedAt: string | null;
}) {
  const t = useTranslations("admin.prospects.audit");
  const [url, setUrl] = useState(sourceUrl);
  const [report, setReport] = useState<WebsiteAuditReport | null>(initialReport);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [isRunning, setIsRunning] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedAuditResult | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  async function handleRun() {
    if (!url.trim()) return;
    setIsRunning(true);
    try {
      const result = await runProspectAuditAction(prospectId, url.trim());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setReport(result);
      setGeneratedAt(result.fetchedAt);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRunAiEnrich() {
    if (!url.trim()) return;
    setIsEnriching(true);
    try {
      const result = await runEnrichedProspectAuditAction(prospectId, url.trim());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEnrichedData(result);
      setReport(result.technicalAudit);
      setGeneratedAt(result.technicalAudit.fetchedAt);
      toast.success("Audit IA et analyse financière générés avec succès !");
    } finally {
      setIsEnriching(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          report &&
          !report.siteUnreachable && (
            <Badge tone={GRADE_TONE[report.grade]}>{t("scoreBadge", { score: report.score, grade: report.grade })}</Badge>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={t("urlLabel")}>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("urlPlaceholder")}
              disabled={isRunning || isEnriching}
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRun} disabled={isRunning || isEnriching || !url.trim()} variant="outline">
            <ScanSearch data-icon="inline-start" size={14} />
            {isRunning ? t("running") : report ? t("rerun") : t("run")}
          </Button>
          <Button onClick={handleRunAiEnrich} disabled={isRunning || isEnriching || !url.trim()}>
            <Sparkles data-icon="inline-start" size={14} />
            {isEnriching ? "Analyse IA…" : "Audit IA + Marges"}
          </Button>
        </div>
      </div>

      {generatedAt && (
        <p className="mt-2 text-[12px] text-mv-ink-faint">
          {t("lastGenerated", { date: new Date(generatedAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" }) })}
        </p>
      )}

      {/* Enriched AI Findings */}
      {enrichedData && (
        <div className="mt-4 rounded-xl border border-mv-border bg-mv-cream-soft p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-[14px] font-semibold text-mv-ink flex items-center gap-1.5">
              <Sparkles size={15} className="text-mv-green" /> Diagnostic commercial & Pertes estimées
            </p>
            <span className="text-[12px] font-bold text-mv-red">~{enrichedData.monthlyCommissionLoss}/mois</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-[12px]">
            <div className="space-y-1.5 rounded-lg border border-mv-border-soft bg-mv-surface p-3">
              <p className="font-medium text-mv-amber flex items-center gap-1">
                <AlertTriangle size={13} /> Goulots / Pertes identifiées
              </p>
              <ul className="space-y-1 text-mv-ink-soft">
                {enrichedData.keyFindings.weaknesses.map((w, idx) => (
                  <li key={idx} className="list-disc list-inside">{w}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 rounded-lg border border-mv-border-soft bg-mv-surface p-3">
              <p className="font-medium text-mv-green flex items-center gap-1">
                <TrendingUp size={13} /> Opportunités Minerva Flow
              </p>
              <ul className="space-y-1 text-mv-ink-soft">
                {enrichedData.keyFindings.opportunities.map((o, idx) => (
                  <li key={idx} className="list-disc list-inside">{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {report?.siteUnreachable && (
        <p className="mt-4 rounded-lg border border-mv-red/30 bg-mv-red-bg px-3 py-2.5 text-[12.5px] text-mv-red">
          {t("unreachable")}
        </p>
      )}

      {report && !report.siteUnreachable && (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHECK_ORDER.map((id) => {
            const check = report.checks.find((c) => c.id === id);
            if (!check) return null;
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 py-2 text-[12.5px]"
              >
                {check.passed ? (
                  <CircleCheck size={15} className="shrink-0 text-mv-green-dark" />
                ) : (
                  <CircleX size={15} className="shrink-0 text-mv-ink-faint" />
                )}
                <span className={check.passed ? "text-mv-ink" : "text-mv-ink-soft"}>{t(`checks.${id}`)}</span>
                {check.detail && <span className="ml-auto text-[11px] text-mv-ink-faint">{check.detail}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
