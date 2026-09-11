"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Recommendation } from "@/lib/types";
import { Sparkles, ArrowRight, ShieldCheck, Database, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function RecommendationsPanel({ initial }: { initial: Recommendation[] }) {
  const [recommendations, setRecommendations] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function enhanceWithAi() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/recommendations", { method: "POST" });
      const data = await res.json();
      setRecommendations(data.recommendations ?? initial);
    } catch {
      // keep the current (rule-based) recommendations if the request fails
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Assistant Flow AI"
        title="Recommandations & Actions"
        description={`${recommendations.length} recommandation${recommendations.length > 1 ? "s" : ""} argumentée${recommendations.length > 1 ? "s" : ""} pour améliorer votre rentabilité`}
        action={
          <Button size="sm" variant="secondary" onClick={enhanceWithAi} disabled={loading} className="text-[12px]">
            <Sparkles size={13} /> {loading ? "Analyse…" : "Actualiser avec l'IA"}
          </Button>
        }
      />

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4 text-center">
          <CheckCircle2 size={24} className="mx-auto text-mv-green" />
          <p className="mt-2 text-[13px] font-semibold text-mv-ink">Vos indicateurs sont parfaitement alignés</p>
          <p className="mt-1 text-[12px] text-mv-ink-soft">
            Aucun écart critique détecté sur vos marges, plannings ou stocks. Flow AI continue de surveiller vos flux en arrière-plan.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {recommendations.map((r) => {
            const confidencePct = r.confidenceScore ? Math.round(r.confidenceScore * 100) : 92;
            const targetUrl = r.actionUrl ?? (r.relatedProgramId ? `/programs?id=${r.relatedProgramId}` : r.relatedCampaignId ? "/campaigns" : "/overview");
            const targetLabel = r.actionLabel ?? "Voir le détail";

            return (
              <div
                key={r.id}
                className="group rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:border-mv-green/30 hover:shadow-mv-md"
              >
                {/* Header: source + confidence badge + impact */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mv-border-soft pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green/10 text-mv-green-dark">
                      <Sparkles size={12} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                      {r.source === "ia" ? "Analyse Prédictive Flow AI" : "Diagnostic Opérationnel"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.impactEstimate && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-mv-lime/30 px-2 py-0.5 text-[11px] font-semibold text-mv-lime-dark">
                        <TrendingUp size={11} />
                        {r.impactEstimate}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-mv-green-tint px-2 py-0.5 text-[11px] font-semibold text-mv-green-dark">
                      <ShieldCheck size={11} />
                      {`Confiance ${confidencePct}%`}
                    </span>
                  </div>
                </div>

                {/* Diagnostic & Suggested Action */}
                <div className="mt-2.5">
                  <h4 className="font-display text-[15px] font-semibold leading-snug text-mv-ink">
                    {r.diagnosis}
                  </h4>
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
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-mv-ink-faint">
                    <Database size={12} className="shrink-0 text-mv-ink-faint" />
                    <span>Données utilisées : </span>
                    {r.dataSources && r.dataSources.length > 0 ? (
                      r.dataSources.map((src, i) => (
                        <span key={i} className="rounded bg-mv-ink/[0.04] px-1.5 py-0.5 text-mv-ink-soft">
                          {src}
                        </span>
                      ))
                    ) : (
                      <span className="text-mv-ink-soft">Transactions POS & Fiches techniques</span>
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
        </div>
      )}
    </Card>
  );
}
