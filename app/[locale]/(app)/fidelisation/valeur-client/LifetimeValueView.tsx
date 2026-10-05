"use client";


import { useTranslations, useLocale } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChartNoAxesCombined, CircleDollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { addAcquisitionCostAction, type AcquisitionCostCategory } from "./actions";

export type AcquisitionCostRow = { id: string; category: AcquisitionCostCategory; amount: number; spentOn: string; note: string | null };

const CATEGORY_LABELS_KEYS: Record<AcquisitionCostCategory, string> = {
  publicite: "categorylabePublicite",
  commissions: "categorylabeCommissions",
  agence: "categorylabeAgence",
  promotions: "categorylabePromotions",
  equipement: "categorylabeEquipement",
};

export function LifetimeValueView({
  restaurantId,
  metrics,
  costs,
  newCustomers,
  canEdit,
}: {
  restaurantId: string;
  metrics: { customerCount: number; revenueLtv: number; marginLtv: number | null; combinedLtv: number | null; grossMarginPct: number | null; missingCostItemCount: number; hasSalesWeights: boolean };
  costs: AcquisitionCostRow[];
  newCustomers: number;
  canEdit: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("ltvView");
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [category, setCategory] = useState<AcquisitionCostCategory>("publicite");
  const periodSpend = costs.reduce((sum, row) => sum + row.amount, 0);
  const cac = newCustomers > 0 ? periodSpend / newCustomers : null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const ok = await addAcquisitionCostAction({
        restaurantId,
        category,
        amount: Number(formData.get("amount")),
        spentOn: String(formData.get("spentOn") ?? ""),
        note: String(formData.get("note") ?? ""),
      });
      setNotice(ok ? t("expenseAddedTheIndicators") : t("theExpenseCouldNot"));
      if (ok) (document.getElementById("acquisition-cost-form") as HTMLFormElement | null)?.reset();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/fidelisation" className="inline-flex items-center gap-2 text-sm text-mv-ink-faint hover:text-mv-green-dark">
        <ArrowLeft size={15} /> {t("loyaltyBack")}
      </Link>
      <PageHeader eyebrow={t("loyaltyCustomerAnalysis")} title={t("customerValueAcquisition")} description={t("trackRevenuePerCustomer")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CircleDollarSign size={17} />} label={t("combinedLtv")} value={metrics.combinedLtv === null ? t("toConfirm") : formatCurrency(metrics.combinedLtv, locale)} detail={t("ltvCombinedDetail")} />
        <MetricCard icon={<CircleDollarSign size={17} />} label={t("averageRevenueLtv")} value={formatCurrency(metrics.revenueLtv, locale)} detail={t("ltvRevenueDetail")} />
        <MetricCard icon={<ChartNoAxesCombined size={17} />} label={t("estimatedMarginLtv")} value={metrics.marginLtv === null ? t("toConfirm") : formatCurrency(metrics.marginLtv, locale)} detail={metrics.grossMarginPct === null ? t("itemsToConfirm", { count: metrics.missingCostItemCount, what: metrics.hasSalesWeights ? t("marginWordShort") : t("soldVolumes") }) : t("weightedMenuMargin", { pct: Math.round(metrics.grossMarginPct * 100) })} />
        <MetricCard icon={<ChartNoAxesCombined size={17} />} label={t("averageCac12Months")} value={cac === null ? "—" : formatCurrency(cac, locale)} detail={t("spendOverNew", { amount: formatCurrency(periodSpend, locale), count: newCustomers })} />
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg text-mv-ink">{t("acquisitionSpend")}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-faint">{t("cacIncludesAdvertisingCommissions")}</p>
        </div>
        {canEdit ? (
          <form id="acquisition-cost-form" action={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field label={t("category")}>
              <select value={category} onChange={(event) => setCategory(event.target.value as AcquisitionCostCategory)} className="h-10 w-full rounded-lg border border-mv-border bg-mv-surface px-3 text-sm text-mv-ink">
                {Object.entries(CATEGORY_LABELS_KEYS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
              </select>
            </Field>
            <Field label={t("amount")}><Input name="amount" type="number" min="0.01" step="0.01" required /></Field>
            <Field label={t("date")}><Input name="spentOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label={t("noteOptional")}><Input name="note" maxLength={400} /></Field>
            <Button type="submit" disabled={busy}><Plus size={14} /> {t("add")}</Button>
          </form>
        ) : <p className="rounded-lg bg-mv-cream-soft p-3 text-sm text-mv-ink-soft">{t("enteringAcquisitionCostsIs")}</p>}
        {notice && <p className="mt-3 text-sm text-mv-green-dark" role="status">{notice}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-mv-border-soft px-5 py-4">
          <h2 className="font-display text-lg text-mv-ink">{t("spendEntered12Months")}</h2>
          <p className="mt-1 text-[12px] text-mv-ink-faint">{t("expenseCount", { count: costs.length })}</p>
        </div>
        {costs.length === 0 ? <p className="px-5 py-8 text-center text-sm text-mv-ink-faint">{t("addYourSpendTo")}</p> : (
          <div className="divide-y divide-mv-border-soft">
            {costs.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><div><p className="font-medium text-mv-ink">{t(CATEGORY_LABELS_KEYS[row.category])}</p><p className="text-xs text-mv-ink-faint">{row.spentOn}{row.note ? ` · ${row.note}` : ""}</p></div><span className="font-semibold text-mv-ink">{formatCurrency(row.amount, locale)}</span></div>)}
          </div>
        )}
      </Card>
      <p className="text-[12px] leading-relaxed text-mv-ink-faint">{t("marginLtvIsAn")}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <Card className="p-4"><div className="mb-3 flex items-center gap-2 text-mv-green-dark">{icon}<span className="text-[12px] font-semibold uppercase tracking-wide">{label}</span></div><p className="font-display text-[26px] text-mv-ink">{value}</p><p className="mt-1 text-[12px] leading-relaxed text-mv-ink-faint">{detail}</p></Card>;
}
