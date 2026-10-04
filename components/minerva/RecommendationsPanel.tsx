"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import type { Recommendation } from "@/lib/types";
import { Sparkles, ArrowRight, ShieldCheck, Database, TrendingUp, CheckCircle2, Clock3 } from "lucide-react";
import { useState } from "react";

export function RecommendationsPanel({ initial }: { initial: Recommendation[] }) {
  const [recommendations, setRecommendations] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refreshAnalysis() {
    setLoading(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/ai/recommendations", { method: "POST" });
      if (!res.ok) throw new Error("Recommendation refresh failed");
      const data = await res.json();
      setRecommendations(data.recommendations ?? initial);
    } catch {
      setRefreshError("L’actualisation a échoué. Les conseils déjà affichés sont conservés.");
    } finally {
      setLoading(false);
    }
  }

  const sortedRecs = [...recommendations].sort((a, b) => {
    const freshnessRank = { recent: 0, aging: 1, stale: 2, unknown: 3 };
    return (freshnessRank[a.evidenceFreshness?.status ?? "unknown"] ?? 3) -
      (freshnessRank[b.evidenceFreshness?.status ?? "unknown"] ?? 3);
  });

  const visibleRecs = showAll ? sortedRecs : sortedRecs.slice(0, 3);
  const hiddenCount = Math.max(0, sortedRecs.length - 3);

  return (
    <Card>
      <CardHeader
        eyebrow="Assistant Flow AI"
        title="Recommandations & Actions"
        description={
          recommendations.length === 0
            ? "Indicateurs sous contrôle"
            : `${recommendations.length} recommandation${recommendations.length > 1 ? "s" : ""} argumentée${recommendations.length > 1 ? "s" : ""}${hiddenCount > 0 && !showAll ? ` · 3 affichées` : ""}`
        }
        action={
          <Button size="sm" variant="secondary" onClick={refreshAnalysis} disabled={loading} className="text-[12px]">
            <Sparkles size={13} /> {loading ? "Analyse…" : "Actualiser l’analyse"}
          </Button>
        }
      />

      {refreshError && <p className="mb-3 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2 text-[12px] text-mv-ink-soft" role="alert">{refreshError}</p>}

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4 text-center">
          <CheckCircle2 size={24} className="mx-auto text-mv-green" />
          <p className="mt-2 text-[13px] font-semibold text-mv-ink">Aucun signal à traiter pour le moment</p>
          <p className="mt-1 text-[12px] text-mv-ink-soft">
            Cela reflète les données actuellement disponibles. Actualisez l’analyse après avoir ajouté des ventes, des coûts ou des stocks.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {visibleRecs.map((r) => {
            const targetUrl = r.actionUrl ?? (r.relatedProgramId ? `/programs?id=${r.relatedProgramId}` : r.relatedCampaignId ? "/campaigns" : "/overview");
            const targetLabel = r.actionLabel ?? "Voir le détail";
            const freshness = r.evidenceFreshness;
            const freshnessLabel = freshness?.status === "recent"
              ? "Donnée récente"
              : freshness?.status === "aging"
                ? "À actualiser"
                : freshness?.status === "stale"
                  ? "Donnée ancienne"
                  : "Date de donnée inconnue";
            const confidenceLabel = r.confidenceLevel === "elevee"
              ? "Signal fort"
              : r.confidenceLevel === "moyenne"
                ? "Signal à confirmer"
                : "Signal indicatif";
            const categoryLabel: Record<string, string> = {
              menu: "Menu", marge: "Marge", stock: "Stock", fidelite: "Fidélité",
              operations: "Opérations", finances: "Finances", campagnes: "Campagnes",
            };

            return (
              <div
                key={r.id}
                className="group rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:border-mv-green/30 hover:shadow-mv-md"
              >
                {/* Header: source + confidence badge + impact */}
                <div className="flex flex-col items-start gap-2 border-b border-mv-border-soft pb-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green/10 text-mv-green-dark">
                      <Sparkles size={12} />
                    </span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">
                      {r.source === "ia" ? "Analyse Flow AI" : "Diagnostic vérifiable"}
                    </span>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {r.impactEstimate && (
                      <span className="inline-flex max-w-full basis-full items-center gap-1 rounded-md bg-mv-lime/30 px-2 py-0.5 text-[12px] font-semibold text-mv-lime-dark sm:basis-auto">
                        <TrendingUp size={11} />
                        {r.impactKind === "scenario" ? "Scénario · " : r.impactKind === "qualitative" ? "Impact · " : ""}
                        {r.impactEstimate}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-mv-green-tint px-2 py-0.5 text-[12px] font-semibold text-mv-green-dark">
                      <ShieldCheck size={11} />
                      {confidenceLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[12px] font-medium text-mv-ink-soft" title="Récente ≤ 14 jours · à actualiser 15–45 jours · ancienne > 45 jours">
                      <Clock3 size={11} />
                      {freshnessLabel}{freshness?.asOf ? ` · ${freshness.asOf}` : ""}
                    </span>
                  </div>
                </div>

                {/* Diagnostic & Suggested Action */}
                <div className="mt-2.5">
                  <h4 className="font-display text-[15px] font-semibold leading-snug text-mv-ink">
                    {r.diagnosis}
                  </h4>
                  {r.category && <span className="mt-1 inline-flex rounded-full bg-mv-cream-soft px-2 py-0.5 text-[12px] font-semibold text-mv-ink-soft">{categoryLabel[r.category]}</span>}
                  <p className="mt-1 text-[13px] leading-relaxed text-mv-ink-soft">
                    {r.suggestedAction}
                  </p>
                </div>

                {/* Explanation ("Pourquoi ?") */}
                {r.explanation && (
                  <div className="mt-2 rounded-lg bg-mv-cream-soft px-3 py-2 text-[12px] text-mv-ink-soft">
                    <span className="font-semibold text-mv-ink">Pourquoi cette action ? </span>
                    {r.explanation}
                  </div>
                )}

                {/* Footer: Data Sources + Direct CTA */}
                <div className="mt-3 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-mv-border-soft/60">
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-mv-ink-faint">
                    <Database size={12} className="shrink-0 text-mv-ink-faint" />
                    <span>Données utilisées : </span>
                    {r.dataSources && r.dataSources.length > 0 ? (
                      r.dataSources.map((src, i) => (
                        <span key={i} className="rounded bg-mv-ink/[0.04] px-1.5 py-0.5 text-mv-ink-soft">
                          {src}
                        </span>
                      ))
                    ) : (
                      <span className="text-mv-ink-soft">Sources détaillées indisponibles</span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <Button
                      href={targetUrl}
                      size="sm"
                      className="text-[12px] whitespace-nowrap gap-1 font-semibold"
                    >
                      {targetLabel}
                      <ArrowRight size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-[12.5px] font-medium text-mv-green-dark hover:underline py-1.5 transition-colors"
              >
                {showAll
                  ? "Réduire aux 3 recommandations majeures"
                  : `Voir les ${hiddenCount} autre${hiddenCount > 1 ? "s" : ""} recommandation${hiddenCount > 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
