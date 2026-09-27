"use client";

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

const CATEGORY_LABELS: Record<AcquisitionCostCategory, string> = {
  publicite: "Publicité",
  commissions: "Commissions",
  agence: "Agence",
  promotions: "Promotions",
  equipement: "Équipement",
};

export function LifetimeValueView({
  restaurantId,
  metrics,
  costs,
  newCustomers,
  canEdit,
}: {
  restaurantId: string;
  metrics: { customers: number; revenueLtv: number; marginLtv: number; grossMarginPct: number };
  costs: AcquisitionCostRow[];
  newCustomers: number;
  canEdit: boolean;
}) {
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
      setNotice(ok ? "Dépense ajoutée. Les indicateurs sont à jour." : "La dépense n’a pas pu être enregistrée.");
      if (ok) (document.getElementById("acquisition-cost-form") as HTMLFormElement | null)?.reset();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/fidelisation" className="inline-flex items-center gap-2 text-sm text-mv-ink-faint hover:text-mv-green-dark">
        <ArrowLeft size={15} /> Fidélisation
      </Link>
      <PageHeader eyebrow="Fidélisation · Analyse client" title="Valeur client & acquisition" description="Suivez le revenu généré par client, la marge estimée et le coût d’acquisition sur les 12 derniers mois." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={<CircleDollarSign size={17} />} label="LTV revenu moyen" value={formatCurrency(metrics.revenueLtv)} detail="Revenu cumulé moyen par client avec achat" />
        <MetricCard icon={<ChartNoAxesCombined size={17} />} label="LTV marge estimée" value={formatCurrency(metrics.marginLtv)} detail={`Marge actuelle du menu : ${Math.round(metrics.grossMarginPct * 100)} %`} />
        <MetricCard icon={<ChartNoAxesCombined size={17} />} label="CAC moyen · 12 mois" value={cac === null ? "—" : formatCurrency(cac)} detail={`${formatCurrency(periodSpend)} de dépenses ÷ ${newCustomers} nouveaux clients`} />
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg text-mv-ink">Dépenses d’acquisition</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-faint">Le CAC inclut publicité, commissions, agence, promotions et équipement. Ajoutez les dépenses des 12 derniers mois; le calcul les divise par les nouveaux profils clients créés sur la même période.</p>
        </div>
        {canEdit ? (
          <form id="acquisition-cost-form" action={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field label="Catégorie">
              <select value={category} onChange={(event) => setCategory(event.target.value as AcquisitionCostCategory)} className="h-10 w-full rounded-lg border border-mv-border bg-mv-surface px-3 text-sm text-mv-ink">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Montant · $"><Input name="amount" type="number" min="0.01" step="0.01" required /></Field>
            <Field label="Date"><Input name="spentOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label="Note · facultatif"><Input name="note" maxLength={400} /></Field>
            <Button type="submit" disabled={busy}><Plus size={14} /> Ajouter</Button>
          </form>
        ) : <p className="rounded-lg bg-mv-cream-soft p-3 text-sm text-mv-ink-soft">La saisie des coûts d’acquisition est réservée aux propriétaires et gestionnaires.</p>}
        {notice && <p className="mt-3 text-sm text-mv-green-dark" role="status">{notice}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-mv-border-soft px-5 py-4">
          <h2 className="font-display text-lg text-mv-ink">Dépenses saisies · 12 mois</h2>
          <p className="mt-1 text-[12px] text-mv-ink-faint">{costs.length} dépense{costs.length === 1 ? "" : "s"}</p>
        </div>
        {costs.length === 0 ? <p className="px-5 py-8 text-center text-sm text-mv-ink-faint">Ajoutez vos dépenses pour obtenir un CAC fiable.</p> : (
          <div className="divide-y divide-mv-border-soft">
            {costs.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><div><p className="font-medium text-mv-ink">{CATEGORY_LABELS[row.category]}</p><p className="text-xs text-mv-ink-faint">{row.spentOn}{row.note ? ` · ${row.note}` : ""}</p></div><span className="font-semibold text-mv-ink">{formatCurrency(row.amount)}</span></div>)}
          </div>
        )}
      </Card>
      <p className="text-[11.5px] leading-relaxed text-mv-ink-faint">La LTV de marge est une estimation à partir des coûts actuels des articles et des ventes cumulées. Les coûts historiques par commande ne sont pas encore conservés; la marge peut donc différer si vos coûts ont changé.</p>
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <Card className="p-4"><div className="mb-3 flex items-center gap-2 text-mv-green-dark">{icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span></div><p className="font-display text-[26px] text-mv-ink">{value}</p><p className="mt-1 text-[11.5px] leading-relaxed text-mv-ink-faint">{detail}</p></Card>;
}
