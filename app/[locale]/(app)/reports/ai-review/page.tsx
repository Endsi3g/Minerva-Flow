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
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AiReviewPage() {
  const t = useTranslations("aiReview");
  const tr = useTranslations("reportDetail");
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
        toast.success(t("generateSuccess"));
        getAiReviewsAction().then(setReviews);
        setFrom("");
        setTo("");
      } else {
        toast.error(result.error ?? t("generateFailed"));
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <Link href="/reports" className="mb-3 flex items-center gap-1 text-[13px] text-mv-ink-faint hover:text-mv-ink">
        <ChevronLeft size={14} /> {tr("breadcrumbReports")}
      </Link>

      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader
            eyebrow={t("generateEyebrow")}
            title={t("generateTitle")}
            description={t("generateDescription")}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={tr("from")}>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={tr("to")}>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleGenerate} disabled={!from || !to || generating}>
                <Sparkles size={14} /> {generating ? t("generating") : t("generate")}
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <p className="text-[13px] text-mv-ink-faint">{t("loading")}</p>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
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
                    {t("strengthsWeaknessesCount", { strengths: r.strengths.length, weaknesses: r.weaknesses.length })}
                  </p>
                </div>
                <Badge tone={r.source === "auto" ? "neutral" : "green"}>
                  {r.source === "auto" ? t("sourceAuto") : t("sourceOnDemand")}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
