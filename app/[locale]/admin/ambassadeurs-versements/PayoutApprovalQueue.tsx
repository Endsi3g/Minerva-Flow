"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveAmbassadorPayoutAction } from "./actions";

export type PayoutApprovalItem = {
  id: string;
  email: string | null;
  code: string;
  amount: number;
  currency: string;
  invoiceId: string;
  payableAt: string;
  createdAt: string;
};

export function PayoutApprovalQueue({ items }: { items: PayoutApprovalItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function approve(item: PayoutApprovalItem) {
    const amount = new Intl.NumberFormat("fr-CA", { style: "currency", currency: item.currency }).format(item.amount);
    if (!window.confirm(`Approuver le versement de ${amount} pour ${item.email ?? item.code} ?`)) return;
    setBusy(item.id);
    const ok = await approveAmbassadorPayoutAction(item.id);
    setBusy("");
    setNotice(ok ? "Approbation enregistrée. L’ambassadeur peut maintenant demander le transfert." : "La commission n’est plus admissible ou l’approbation a échoué.");
    if (ok) router.refresh();
  }

  if (items.length === 0) {
    return <div className="border-t border-mv-border-soft py-8 text-sm text-mv-ink-soft">Aucune commission admissible n’attend d’approbation.</div>;
  }

  return <div className="divide-y divide-mv-border-soft border-y border-mv-border-soft">
    {items.map((item) => <article key={item.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-sm font-semibold text-mv-ink">{new Intl.NumberFormat("fr-CA", { style: "currency", currency: item.currency }).format(item.amount)} · {item.email ?? "Ambassadeur"}</p>
        <p className="mt-1 text-xs text-mv-ink-faint">Code {item.code} · Facture réglée le {new Date(item.createdAt).toLocaleDateString("fr-CA")} · Admissible depuis le {new Date(item.payableAt).toLocaleDateString("fr-CA")}</p>
        <p className="mt-1 font-mono text-[10px] text-mv-ink-faint">{item.invoiceId}</p>
      </div>
      <Button size="sm" onClick={() => approve(item)} loading={busy === item.id} disabled={Boolean(busy)}>Approuver le versement</Button>
    </article>)}
    {notice && <p className="py-3 text-xs text-mv-ink-soft" role="status">{notice}</p>}
  </div>;
}
