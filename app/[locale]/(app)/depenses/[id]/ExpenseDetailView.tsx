"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { createExpenseShareLinkAction } from "../actions";
import type { FinancialTransaction } from "@/lib/types";
import { ArrowLeft, Download, Link2, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ExpenseDetailView({
  transaction,
  createdByName,
  updatedByName,
}: {
  transaction: FinancialTransaction;
  createdByName: string | null;
  updatedByName: string | null;
}) {
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLinking(true);
    try {
      const token = await createExpenseShareLinkAction(transaction.id);
      if (token) setLink(`${window.location.origin}/e/${token}`);
    } finally {
      setLinking(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <Link
        href="/depenses"
        className="no-print mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Retour aux dépenses
      </Link>

      <PageHeader
        eyebrow="Dépense"
        title={transaction.description}
        description={formatDate(transaction.date)}
        action={
          <div className="no-print flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Download size={14} /> Télécharger en PDF
            </Button>
            {!link ? (
              <Button size="sm" variant="secondary" onClick={handleShare} disabled={linking}>
                <Link2 size={14} /> {linking ? "Génération…" : "Partager"}
              </Button>
            ) : null}
          </div>
        }
      />

      {link && (
        <div className="no-print mb-4 flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2">
          <p className="flex-1 truncate text-[12px] text-mv-ink-soft">{link}</p>
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            aria-label="Copier le lien"
          >
            {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
          </button>
        </div>
      )}

      <Card className="max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-[24px] font-medium text-mv-ink">{formatCurrency(transaction.amount)}</p>
          <Badge tone={transaction.reviewed ? "green" : "amber"}>
            {transaction.reviewed ? "Revue" : "À revoir"}
          </Badge>
        </div>
        <div className="space-y-3 border-t border-mv-border-soft pt-4 text-[13px]">
          <div className="flex justify-between">
            <span className="text-mv-ink-faint">Catégorie</span>
            <span className="font-medium text-mv-ink">{transaction.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mv-ink-faint">Compte / méthode</span>
            <span className="font-medium text-mv-ink">{transaction.sourceAccount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mv-ink-faint">Créée par</span>
            <span className="font-medium text-mv-ink">{createdByName ?? "Import CSV"}</span>
          </div>
          {transaction.updatedAt && (
            <div className="flex justify-between">
              <span className="text-mv-ink-faint">Dernière modification</span>
              <span className="font-medium text-mv-ink">
                {updatedByName ?? "—"} · {formatRelativeTime(transaction.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
