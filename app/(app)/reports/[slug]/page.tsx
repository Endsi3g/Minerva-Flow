import { getReport, reports, trendFor, breakdownFor, campaignsForReport } from "@/lib/reports";
import { notFound } from "next/navigation";
import { ReportView } from "./ReportView";

export function generateStaticParams() {
  return reports.map((r) => ({ slug: r.slug }));
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();

  const trend = trendFor(slug);
  const breakdown = breakdownFor(slug);
  const campaigns = report.kind === "count" ? campaignsForReport() : [];

  return <ReportView report={report} trend={trend} breakdown={breakdown} campaigns={campaigns} />;
}
