"use client";

import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FinancialTransaction } from "@/lib/types";
import { ReceiptText, ChevronRight } from "lucide-react";
import Link from "next/link";

export function DepensesView({ transactions }: { transactions: FinancialTransaction[] }) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Aucune dépense enregistrée"
        description="Ajoutez-en une depuis la page Finance, onglet Transactions."
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-[12.5px] text-mv-ink-faint">
        {transactions.length} dépense{transactions.length > 1 ? "s" : ""} — total {formatCurrency(total)}
      </p>
      <Table>
        <THead>
          <Th>Date</Th>
          <Th>Description</Th>
          <Th>Catégorie</Th>
          <Th className="text-right">Montant</Th>
          <Th>Statut</Th>
          <Th></Th>
        </THead>
        <tbody>
          {transactions.map((t) => (
            <Tr key={t.id}>
              <Td className="text-mv-ink-soft">{formatDate(t.date)}</Td>
              <Td className="font-medium text-mv-ink">{t.description}</Td>
              <Td>
                <Badge tone="neutral">{t.category}</Badge>
              </Td>
              <Td className="text-right font-semibold text-mv-ink">{formatCurrency(t.amount)}</Td>
              <Td>{t.reviewed ? <Badge tone="green">Revue</Badge> : <Badge tone="amber">À revoir</Badge>}</Td>
              <Td className="text-right">
                <Link
                  href={`/depenses/${t.id}`}
                  aria-label="Voir le détail"
                  className="inline-flex rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                >
                  <ChevronRight size={15} />
                </Link>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
