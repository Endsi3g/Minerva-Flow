"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { TablePagination } from "@/components/minerva/TablePagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { updateCategoryAction, deleteCategoryAction, categorizeTransactionsAction } from "../../actions";
import type { ExpenseCategory, FinancialTransaction } from "@/lib/types";
import { Pencil, Trash2, ReceiptText, Plus, Check } from "lucide-react";

const PAGE_SIZE = 20;

function EditCategoryModal({
  category,
  open,
  onClose,
  onSaved,
}: {
  category: ExpenseCategory;
  open: boolean;
  onClose: () => void;
  onSaved: (patch: { name: string; description: string | null }) => void;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ok = await updateCategoryAction(category.id, { name, description: description.trim() || null });
      if (ok) {
        onSaved({ name: name.trim(), description: description.trim() || null });
        onClose();
      } else {
        notifyError("La mise à jour a échoué.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier la catégorie">
      <div className="space-y-4">
        <Field label="Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" hint="Optionnel — à quoi sert cette catégorie">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. : Frais liés aux fournisseurs de nourriture et boissons"
          />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignTransactionsModal({
  categoryName,
  transactions,
  open,
  onClose,
  onAssigned,
}: {
  categoryName: string;
  transactions: FinancialTransaction[];
  open: boolean;
  onClose: () => void;
  onAssigned: (moved: FinancialTransaction[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  const filtered = useMemo(
    () => transactions.filter((t) => t.description.toLowerCase().includes(search.toLowerCase())),
    [transactions, search]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) return;
    setAssigning(true);
    try {
      const updated = await categorizeTransactionsAction(Array.from(selected), categoryName);
      if (updated > 0) {
        onAssigned(transactions.filter((t) => selected.has(t.id)));
        setSelected(new Set());
        onClose();
      } else {
        notifyError("L'assignation a échoué.");
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assigner des transactions" width={520}>
      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une transaction…"
        />
        <div className="max-h-[45vh] space-y-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-mv-ink-faint">Aucune transaction à assigner.</p>
          ) : (
            filtered.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-mv-border-soft px-3 py-2 hover:bg-mv-cream-soft"
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="h-3.5 w-3.5 shrink-0 rounded accent-mv-green"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-mv-ink">{t.description}</p>
                  <p className="text-[11px] text-mv-ink-faint">
                    {formatDate(t.date)} — {t.category}
                  </p>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold text-mv-ink">{formatCurrency(t.amount)}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={assigning}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={assigning || selected.size === 0}>
            {assigning ? "Assignation…" : `Assigner ${selected.size || ""}`.trim()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CategoryDetailView({
  category: initialCategory,
  transactions: initialTransactions,
  assignableTransactions,
}: {
  category: ExpenseCategory;
  transactions: FinancialTransaction[];
  assignableTransactions: FinancialTransaction[];
  otherCategoryNames: string[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [assignable, setAssignable] = useState(assignableTransactions);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleDelete() {
    if (category.isDefault) return;
    if (!confirm(`Supprimer la catégorie « ${category.name} » ? Ses transactions seront marquées « Non catégorisé ».`))
      return;
    setDeleting(true);
    try {
      const ok = await deleteCategoryAction(category.id);
      if (ok) {
        toast.success("Catégorie supprimée.");
        router.push("/finance");
      } else {
        notifyError("La suppression a échoué.");
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catégorie de dépense"
        title={category.name}
        description={category.description || "Aucune description — cliquez sur Modifier pour en ajouter une."}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Modifier
            </Button>
            {!category.isDefault && (
              <Button size="sm" variant="secondary" onClick={handleDelete} disabled={deleting}>
                <Trash2 size={14} className="text-mv-red" />
                {deleting ? "Suppression…" : "Supprimer"}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Badge tone={category.isDefault ? "neutral" : "lime"}>{category.isDefault ? "Défaut" : "Personnalisée"}</Badge>
        <span className="text-[12.5px] text-mv-ink-faint">
          {transactions.length} transaction{transactions.length > 1 ? "s" : ""}
        </span>
      </div>

      <Card>
        <CardHeader
          eyebrow="Transactions"
          title="Dépenses assignées à cette catégorie"
          action={
            <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
              <Plus size={14} /> Assigner des transactions
            </Button>
          }
        />
        {transactions.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Aucune transaction"
            description="Assignez des transactions existantes à cette catégorie, ou catégorisez-les depuis l'onglet Transactions."
          />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th className="text-right">Montant</Th>
                <Th>Statut</Th>
              </THead>
              <tbody>
                {paginated.map((t) => (
                  <Tr key={t.id}>
                    <Td className="text-mv-ink-soft">{formatDate(t.date)}</Td>
                    <Td className="font-medium">{t.description}</Td>
                    <Td className={t.direction === "in" ? "text-right font-semibold text-mv-green-dark" : "text-right font-semibold text-mv-ink"}>
                      {t.direction === "in" ? "+" : ""}
                      {formatCurrency(t.amount)}
                    </Td>
                    <Td>
                      {t.reviewed ? (
                        <Badge tone="green">
                          <Check size={11} /> Revue
                        </Badge>
                      ) : (
                        <Badge tone="amber">À revoir</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <TablePagination page={safePage} pageCount={pageCount} onPageChange={setPage} className="mt-3" />
          </>
        )}
      </Card>

      <EditCategoryModal
        category={category}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(patch) => setCategory((prev) => ({ ...prev, ...patch }))}
      />
      <AssignTransactionsModal
        categoryName={category.name}
        transactions={assignable}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={(moved) => {
          const movedIds = new Set(moved.map((t) => t.id));
          setTransactions((prev) => [...moved.map((t) => ({ ...t, category: category.name })), ...prev]);
          setAssignable((prev) => prev.filter((t) => !movedIds.has(t.id)));
          toast.success(`${moved.length} transaction${moved.length > 1 ? "s" : ""} assignée${moved.length > 1 ? "s" : ""}.`);
        }}
      />
    </div>
  );
}
