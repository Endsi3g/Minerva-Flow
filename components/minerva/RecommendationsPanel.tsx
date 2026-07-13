"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Recommendation } from "@/lib/types";
import { Lightbulb, Sparkles } from "lucide-react";
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
        title="Recommandations"
        description={`${recommendations.length} suggestion${recommendations.length > 1 ? "s" : ""} basée${recommendations.length > 1 ? "s" : ""} sur vos données`}
        action={
          <Button size="sm" variant="secondary" onClick={enhanceWithAi} disabled={loading}>
            <Sparkles size={14} /> {loading ? "Analyse…" : "Analyser avec l'IA"}
          </Button>
        }
      />
      {recommendations.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">
          Rien à signaler pour l&apos;instant — tout va bien.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommendations.map((r) => (
            <div key={r.id} className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-lime-tint text-mv-lime-dark">
                  <Lightbulb size={12} />
                </div>
                {r.source === "ia" && <Badge tone="lime">IA</Badge>}
              </div>
              <p className="text-[13px] font-semibold leading-snug text-mv-ink">{r.diagnosis}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-mv-ink-soft">{r.suggestedAction}</p>
              {r.relatedProgramId && (
                <Link
                  href={`/programs?id=${r.relatedProgramId}`}
                  className="mt-2 inline-block text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                >
                  Voir le programme →
                </Link>
              )}
              {r.relatedCampaignId && (
                <Link
                  href="/campaigns"
                  className="mt-2 inline-block text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                >
                  Voir la campagne →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
