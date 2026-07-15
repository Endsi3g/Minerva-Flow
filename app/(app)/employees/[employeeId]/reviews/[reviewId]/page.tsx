import { getEmployeeById, getEmployeeReview } from "@/lib/data/employees";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={18} className={i < value ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"} />
      ))}
    </span>
  );
}

export default async function EmployeeReviewPage({
  params,
}: {
  params: Promise<{ employeeId: string; reviewId: string }>;
}) {
  const { employeeId, reviewId } = await params;
  const [employee, review] = await Promise.all([getEmployeeById(employeeId), getEmployeeReview(reviewId)]);

  if (!employee || !review || review.employeeId !== employeeId) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Revue de performance"
        title={employee.fullName}
        description={`${formatDate(review.periodStart)} — ${formatDate(review.periodEnd)} · ${employee.roleTitle}`}
        action={<PrintButton />}
      />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">Note globale</p>
          <StarRow value={review.rating} />
        </div>

        {review.raiseRecommended && (
          <Badge tone="green" className="mt-3">
            Augmentation recommandée
          </Badge>
        )}

        {review.attributedRevenue !== null && (
          <div className="mt-4 rounded-lg bg-mv-cream-soft p-3">
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Chiffre d&apos;affaires attribué</p>
            <p className="font-display text-[18px] font-medium text-mv-green-dark">
              {formatCurrency(review.attributedRevenue)}
            </p>
          </div>
        )}

        {review.strengths && (
          <div className="mt-5">
            <p className="mb-1 font-display text-[14.5px] font-medium text-mv-ink">Points forts</p>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">{review.strengths}</p>
          </div>
        )}

        {review.improvements && (
          <div className="mt-4">
            <p className="mb-1 font-display text-[14.5px] font-medium text-mv-ink">Pistes d&apos;amélioration</p>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">{review.improvements}</p>
          </div>
        )}

        <p className="mt-6 text-[11.5px] text-mv-ink-faint">
          Évalué·e par {review.reviewerName} · {formatDate(review.createdAt.slice(0, 10))}
        </p>
      </Card>
    </div>
  );
}
