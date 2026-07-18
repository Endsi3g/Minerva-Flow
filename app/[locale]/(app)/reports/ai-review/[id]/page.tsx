import { getAiReview } from "@/lib/data/ai-reviews";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleCheck, TriangleAlert, Lightbulb } from "lucide-react";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

export default async function AiReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await getAiReview(id);
  if (!review) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Revue IA"
        title={`${formatDate(review.periodStart)} — ${formatDate(review.periodEnd)}`}
        description={review.source === "auto" ? "Générée automatiquement" : "Générée à la demande"}
        action={<PrintButton />}
      />

      <Card className="mb-4">
        <CardHeader eyebrow="Chiffres" title="Métriques de la période" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {review.metrics.map((m) => (
            <div key={m.slug} className="rounded-lg bg-mv-cream-soft p-3">
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">{m.label}</p>
              <p className="font-display text-[16px] font-medium text-mv-ink">
                {m.unit === "currency" ? formatCurrency(m.value) : m.value}
              </p>
              {m.delta !== undefined && (
                <Badge tone={m.delta >= 0 ? "green" : "red"} className="mt-1 px-1.5 py-0.5 text-[10px]">
                  {m.delta >= 0 ? "↑" : "↓"} {Math.abs(m.delta).toFixed(1)}%
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <CircleCheck size={16} className="text-mv-green-dark" />
          <p className="font-display text-[15px] font-medium text-mv-ink">Points forts</p>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-mv-ink-soft">
          {review.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert size={16} className="text-mv-amber" />
          <p className="font-display text-[15px] font-medium text-mv-ink">Points à surveiller</p>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-mv-ink-soft">
          {review.weaknesses.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb size={16} className="text-mv-lime-dark" />
          <p className="font-display text-[15px] font-medium text-mv-ink">Recommandations</p>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-mv-ink-soft">
          {review.recommendations.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Card>

      <p className="mt-6 text-center text-[11.5px] text-mv-ink-faint">
        Généré le {formatDate(review.createdAt.slice(0, 10))} — visible par toute l&apos;équipe de cet établissement.
      </p>
    </div>
  );
}
