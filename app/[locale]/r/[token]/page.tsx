import { LogoMark } from "@/components/shell/Logo";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { FlowBars } from "@/components/charts/FlowBars";
import { getReportShareByToken } from "@/lib/data/report-shares";
import { formatCurrency, formatDate } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notFound } from "next/navigation";

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`report-share:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const share = await getReportShareByToken(token);

  if (!share) notFound();

  const { report, trend, breakdown } = share.snapshot;

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </div>

        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Rapport partagé · lecture seule
        </div>
        <h1 className="mb-1 font-display text-[28px] font-medium tracking-tight text-mv-ink">
          {share.title}
        </h1>
        <p className="mb-6 text-[12.5px] text-mv-ink-faint">
          Instantané généré le {formatDate(share.createdAt.slice(0, 10))}
        </p>

        <div className="rounded-2xl border-2 border-mv-green bg-mv-surface p-5 shadow-mv-md">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            {report.label}
          </p>
          <p className="mt-4 font-display text-[42px] font-medium leading-none text-mv-ink">
            {report.unit === "currency" ? formatCurrency(report.value) : report.value}
          </p>
          {report.delta !== undefined && (
            <Badge tone={report.delta >= 0 ? "green" : "red"} className="mt-3">
              {report.delta >= 0 ? "↑" : "↓"} {Math.abs(report.delta).toFixed(1)}% vs période précédente
            </Badge>
          )}
          {trend.length > 0 && (
            <div className="mt-4">
              <RevenueChart data={trend} height={160} />
            </div>
          )}
        </div>

        {breakdown.length > 0 && (
          <Card className="mt-6">
            <CardHeader title="Répartition" description="Au moment du partage" />
            <FlowBars lines={breakdown} tone={report.slug === "sorties" ? "ink" : "green"} />
          </Card>
        )}

        <p className="mt-8 text-center text-[12px] text-mv-ink-faint">
          Généré avec Minerva Flow — ce lien ne se met pas à jour automatiquement.
        </p>
      </div>
    </div>
  );
}
