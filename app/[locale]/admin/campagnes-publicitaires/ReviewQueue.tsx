"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updatePaidAdsRequestStatusAction } from "./actions";

export type PaidAdsReviewItem = {
  id: string;
  restaurant: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  monthlyBudgetRange: string;
  goals: string;
  status: "nouveau" | "contacte" | "ferme";
  createdAt: string;
};

const BUDGET_LABELS: Record<string, string> = {
  under_500: "< 500 $/mois",
  "500_1500": "500–1 500 $/mois",
  "1500_5000": "1 500–5 000 $/mois",
  over_5000: "> 5 000 $/mois",
  not_sure: "Budget incertain",
};

const STATUS_LABELS: Record<PaidAdsReviewItem["status"], string> = {
  nouveau: "Nouvelle",
  contacte: "Contacté",
  ferme: "Fermée",
};

export function ReviewQueue({ items }: { items: PaidAdsReviewItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function setStatus(id: string, status: PaidAdsReviewItem["status"]) {
    setBusy(id);
    const ok = await updatePaidAdsRequestStatusAction(id, status);
    setBusy("");
    setNotice(ok ? "Statut mis à jour." : "La mise à jour a échoué.");
    if (ok) router.refresh();
  }

  if (items.length === 0) {
    return <p className="rounded-xl bg-mv-cream-soft p-5 text-[13px] text-mv-ink-soft">Aucune demande ouverte pour le moment.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-mv-border-soft bg-mv-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-mv-ink">
                {item.restaurant} · <span className="text-mv-ink-faint">{STATUS_LABELS[item.status]}</span>
              </p>
              <p className="mt-1 text-[11px] text-mv-ink-faint">
                {item.contactName} · {item.contactEmail}{item.contactPhone ? ` · ${item.contactPhone}` : ""} · {new Date(item.createdAt).toLocaleString("fr-CA")}
              </p>
            </div>
            <span className="rounded-full bg-mv-green/10 px-2.5 py-1 text-[11px] font-semibold text-mv-green-dark">
              {BUDGET_LABELS[item.monthlyBudgetRange] ?? item.monthlyBudgetRange}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-mv-ink-soft">{item.goals}</p>
          <div className="mt-4 flex gap-2">
            {item.status !== "contacte" && (
              <Button size="sm" onClick={() => setStatus(item.id, "contacte")} loading={busy === item.id}>Marquer « Contacté »</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setStatus(item.id, "ferme")} disabled={Boolean(busy)}>Fermer</Button>
          </div>
        </article>
      ))}
      {notice && <p className="text-[12px] text-mv-ink-soft" role="status">{notice}</p>}
    </div>
  );
}
