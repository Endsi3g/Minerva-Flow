"use client";

import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { ExpenseCategory, FinancialTransaction } from "@/lib/types";
import { createTransactionAction } from "@/app/[locale]/(app)/finance/actions";
import { ReceiptText, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { notifyError } from "@/lib/notify-error";

function NewExpenseModal({
  expenseCategories,
  open,
  onClose,
  onCreated,
}: {
  expenseCategories: ExpenseCategory[];
  open: boolean;
  onClose: () => void;
  onCreated: (t: FinancialTransaction) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const transaction = await createTransactionAction({
        date: String(form.get("date") ?? ""),
        description: String(form.get("description") ?? ""),
        amount: Math.abs(Number(form.get("amount") ?? 0)),
        direction: "out",
        category: String(form.get("category") ?? "") || "Non catégorisé",
        sourceAccount: String(form.get("sourceAccount") ?? "") || "Manuel",
      });
      if (transaction) {
        onCreated(transaction);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("L'ajout de la dépense a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une dépense" description="Saisissez une dépense manuellement, sans passer par l'import CSV.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>
          <Field label="Montant ($)">
            <Input name="amount" type="number" min="0" step="0.01" placeholder="Ex : 84.50" required />
          </Field>
        </div>
        <Field label="Description">
          <Input name="description" placeholder="Ex : Achat de farine chez Colabor" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie" hint="Optionnel">
            <Select name="category" defaultValue="">
              <option value="">Non catégorisé</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Compte / méthode" hint="Optionnel">
            <Input name="sourceAccount" placeholder="Ex : Carte de crédit, comptant…" />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ajout…" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DepensesView({
  initialTransactions,
  expenseCategories,
}: {
  initialTransactions: FinancialTransaction[];
  expenseCategories: ExpenseCategory[];
}) {
  const { role } = useApp();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = role === "owner" || role === "manager";
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  function handleCreated(t: FinancialTransaction) {
    setTransactions((prev) => [t, ...prev]);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-mv-ink-faint">
          {transactions.length} dépense{transactions.length > 1 ? "s" : ""} — total {formatCurrency(total)}
        </p>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Ajouter une dépense
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aucune dépense enregistrée"
          description="Ajoutez votre première dépense pour commencer à suivre vos sorties d'argent."
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Ajouter une dépense
              </Button>
            )
          }
        />
      ) : (
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
      )}

      <NewExpenseModal
        expenseCategories={expenseCategories}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
