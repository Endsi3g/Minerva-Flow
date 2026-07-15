"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { generateAiReviewAction, getAiReviewsAction } from "./actions";
import type { AiReview } from "@/lib/data/ai-reviews";
import { formatDate } from "@/lib/utils";
import { Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AiReviewPage() {
  const [reviews, setReviews] = useState<AiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getAiReviewsAction().then((r) => {
      setReviews(r);
      setLoading(false);
    });
  }, []);

  async function handleGenerate() {
    if (!from || !to) return;
    setGenerating(true);
    try {
      const result = await generateAiReviewAction({ from, to });
      if (result.ok) {
        toast.success("Revue IA générée.");
        getAiReviewsAction().then(setReviews);
        setFrom("");
        setTo("");
      } else {
        toast.error(result.error ?? "La génération a échoué.");
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <Link href="/reports" className="mb-3 flex items-center gap-1 text-[13px] text-mv-ink-faint hover:text-mv-ink">
        <ChevronLeft size={14} /> Rapports
      </Link>

      <PageHeader
        eyebrow="Rapports"
        title="Revue IA"
        description="Une analyse automatique de vos performances — forces, faiblesses et recommandations, générée chaque semaine ou à la demande."
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader
            eyebrow="Génération"
            title="Générer une revue sur mesure"
            description="Choisissez une période — l'IA analyse vos données réelles sur cette plage."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Du">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Au">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleGenerate} disabled={!from || !to || generating}>
                <Sparkles size={14} /> {generating ? "Génération…" : "Générer"}
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Aucune revue IA pour l'instant"
            description="Générez-en une ci-dessus, ou attendez le résumé automatique du lundi."
          />
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Link
                key={r.id}
                href={`/reports/ai-review/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-surface px-4 py-3 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-mv-ink">
                    {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
                  </p>
                  <p className="text-[12px] text-mv-ink-faint">
                    {r.strengths.length} force(s) · {r.weaknesses.length} point(s) à surveiller
                  </p>
                </div>
                <Badge tone={r.source === "auto" ? "neutral" : "green"}>
                  {r.source === "auto" ? "Automatique" : "À la demande"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
