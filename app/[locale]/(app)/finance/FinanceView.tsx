"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { FlowBars } from "@/components/charts/FlowBars";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import posthog from "posthog-js";
import { useCsvTransactionImport } from "@/hooks/use-csv-transaction-import";
import { createCategoryAction, categorizeTransactionsAction, createTransactionAction } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { PosConnectionsCard } from "@/components/minerva/PosConnectionsCard";
import { BreakEvenSimulator } from "@/components/finance/BreakEvenSimulator";
import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
  ExpenseCategory,
  FinancialTransaction,
  FlowLine,
  TransactionDirection,
} from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Bike,
  Mail,
  CalendarCheck2,
  Plus,
  RefreshCw,
  Search,
  Download,
  ReceiptText,
  Tag,
  Pencil,
} from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
  reservation: CalendarCheck2,
};

const statusTone: Record<ConnectionStatus, "green" | "red" | "amber"> = {
  connecte: "green",
  erreur: "red",
  attente: "amber",
};

/** Groups transactions by category into the {label, amount, pct} shape FlowBars expects. */
function computeFlowLines(
  transactions: FinancialTransaction[],
  direction: TransactionDirection
): FlowLine[] {
  const filtered = transactions.filter((t) => t.direction === direction);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of filtered) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }

  return Array.from(byCategory.entries())
    .map(([label, amount]) => ({
      label,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function isCurrentMonth(dateIso: string): boolean {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return dateIso.startsWith(ym);
}

function OverviewTab({ transactions }: { transactions: FinancialTransaction[] }) {
  const t = useTranslations("finance");
  const monthTransactions = useMemo(
    () => transactions.filter((t) => isCurrentMonth(t.date)),
    [transactions]
  );

  const totalIn = monthTransactions
    .filter((t) => t.direction === "in")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTransactions
    .filter((t) => t.direction === "out")
    .reduce((s, t) => s + t.amount, 0);
  const net = totalIn + totalOut;

  const inflows = useMemo(() => computeFlowLines(monthTransactions, "in"), [monthTransactions]);
  const outflows = useMemo(() => computeFlowLines(monthTransactions, "out"), [monthTransactions]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <StatCard
          label={t("overview.inflows")}
          value={formatCurrency(totalIn)}
          icon={ArrowDownLeft}
          sublabel={t("overview.thisMonth")}
          accent="green"
        />
        <StatCard
          label={t("overview.outflows")}
          value={formatCurrency(totalOut)}
          icon={ArrowUpRight}
          sublabel={t("overview.thisMonth")}
          accent="ink"
        />
        <StatCard
          label={t("overview.netFlow")}
          value={formatCurrency(net)}
          icon={Landmark}
          sublabel={
            totalIn > 0
              ? t("overview.netFlowPctOfInflows", { pct: Math.round((net / totalIn) * 100) })
              : t("overview.thisMonth")
          }
          accent="lime"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow={t("overview.whereMoneyComesFrom")}
            title={t("overview.revenueInflows")}
            description={t("overview.inflowsBreakdown")}
          />
          {inflows.length > 0 ? (
            <FlowBars lines={inflows} tone="green" />
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">{t("overview.noInflowsThisMonth")}</p>
          )}
        </Card>
        <Card>
          <CardHeader
            eyebrow={t("overview.whereMoneyGoes")}
            title={t("overview.expenseOutflows")}
            description={t("overview.outflowsBreakdown")}
          />
          {outflows.length > 0 ? (
            <FlowBars lines={outflows} tone="ink" />
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">{t("overview.noOutflowsThisMonth")}</p>
          )}
        </Card>
      </div>

      {/* Break-Even Simulator Section (Valeur ++) */}
      <div className="mt-8">
        <BreakEvenSimulator />
      </div>
    </div>
  );
}

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type CsvLabels = {
  date: string;
  description: string;
  amount: string;
  direction: string;
  category: string;
  account: string;
  reviewed: string;
  in: string;
  out: string;
  yes: string;
  no: string;
};

function downloadCsv(rows: FinancialTransaction[], labels: CsvLabels) {
  const header = [
    labels.date,
    labels.description,
    labels.amount,
    labels.direction,
    labels.category,
    labels.account,
    labels.reviewed,
  ];
  const lines = rows.map((row) => [
    row.date,
    `"${row.description.replace(/"/g, '""')}"`,
    row.amount,
    row.direction === "in" ? labels.in : labels.out,
    row.category,
    row.sourceAccount,
    row.reviewed ? labels.yes : labels.no,
  ]);
  const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
  triggerCsvDownload(csv, `transactions-minerva-flow-${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * QuickBooks Online's "3-column" bank transaction import format — Date,
 * Description, Amount, with outflows as negative amounts rather than a
 * separate direction column. No QuickBooks account needed to use this
 * (it's a plain file format), unlike the POS connections above.
 */
function downloadQuickBooksCsv(rows: FinancialTransaction[]) {
  const header = ["Date", "Description", "Amount"];
  const lines = rows.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.direction === "out" ? -Math.abs(t.amount) : Math.abs(t.amount),
  ]);
  const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
  triggerCsvDownload(csv, `minerva-flow-quickbooks-${new Date().toISOString().slice(0, 10)}.csv`);
}

function CsvDropzone({ onImported }: { onImported: (count: number) => void }) {
  const t = useTranslations("finance");
  const [message, setMessage] = useState<string | null>(null);

  const props = useCsvTransactionImport({
    maxFiles: 1,
    maxFileSize: 5 * 1000 * 1000,
    onImported: (count) => {
      setMessage(t("importedCount", { count }));
      posthog.capture("transactions_imported", { transaction_count: count });
      onImported(count);
    },
  });

  return (
    <div>
      <Dropzone {...props}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
      {message && <p className="mt-2 text-[12.5px] text-mv-green-dark">{message}</p>}
      {props.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {props.errors.map((e) => (
            <p key={e.name} className="text-[12.5px] text-mv-red">
              {e.name} : {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTransactionModal({
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
  const t = useTranslations("finance.newTransaction");
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
        direction: form.get("direction") as TransactionDirection,
        category: String(form.get("category") ?? "") || "Non catégorisé",
        sourceAccount: String(form.get("sourceAccount") ?? "") || "Manuel",
      });
      if (transaction) {
        onCreated(transaction);
        onClose();
      } else {
        toast.error(t("createFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")} description={t("modalDescription")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dateLabel")}>
            <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>
          <Field label={t("typeLabel")}>
            <Select name="direction" defaultValue="out">
              <option value="out">{t("directionOut")}</option>
              <option value="in">{t("directionIn")}</option>
            </Select>
          </Field>
        </div>
        <Field label={t("descriptionLabel")}>
          <Input name="description" placeholder={t("descriptionPlaceholder")} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("amountLabel")}>
            <Input name="amount" type="number" min="0" step="0.01" placeholder={t("amountPlaceholder")} required />
          </Field>
          <Field label={t("categoryLabel")} hint={t("optional")}>
            <Select name="category" defaultValue="">
              <option value="">{t("uncategorized")}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("accountLabel")} hint={t("optional")}>
          <Input name="sourceAccount" placeholder={t("accountPlaceholder")} />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("adding") : t("add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionsTab({
  transactions,
  expenseCategories,
}: {
  transactions: FinancialTransaction[];
  expenseCategories: ExpenseCategory[];
}) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | TransactionDirection>("all");
  const [category, setCategory] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (direction !== "all" && t.direction !== direction) return false;
      if (category !== "all" && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, direction, category]);

  const unreviewedCount = transactions.filter((t) => !t.reviewed).length;

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function applyBulkCategory() {
    if (!bulkCategory || selected.size === 0) return;
    setApplyingBulk(true);
    const updated = await categorizeTransactionsAction(Array.from(selected), bulkCategory);
    setApplyingBulk(false);
    if (updated > 0) {
      setSelected(new Set());
      setBulkCategory("");
      refresh();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            placeholder={t("transactions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-8"
          />
        </div>
        <Select className="w-auto" value={direction} onChange={(e) => setDirection(e.target.value as "all" | TransactionDirection)}>
          <option value="all">{t("transactions.filterAll")}</option>
          <option value="in">{t("transactions.filterInOnly")}</option>
          <option value="out">{t("transactions.filterOutOnly")}</option>
        </Select>
        <Select className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t("transactions.allCategories")}</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
        <span className="text-[12.5px] text-mv-ink-faint">
          {t("transactions.count", { count: filtered.length })}
          {unreviewedCount > 0 && t("transactions.toReview", { count: unreviewedCount })}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Select
                className="h-9 w-auto text-[12.5px]"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                <option value="">{t("transactions.chooseCategory")}</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!bulkCategory || applyingBulk}
                onClick={applyBulkCategory}
              >
                <Tag size={14} /> {t("transactions.categorize", { count: selected.size })}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> {t("transactions.addExpense")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => downloadCsv(filtered, t.raw("csv"))}>
            <Download size={14} /> {t("transactions.exportCsv")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => downloadQuickBooksCsv(filtered)}>
            <Download size={14} /> {t("transactions.exportQuickBooks")}
          </Button>
        </div>
      </div>

      <NewTransactionModal
        expenseCategories={expenseCategories}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={refresh}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={transactions.length === 0 ? t("transactions.emptyTitleNone") : t("transactions.emptyTitleNoMatch")}
          description={
            transactions.length === 0
              ? t("transactions.emptyDescriptionNone")
              : t("transactions.emptyDescriptionNoMatch")
          }
        />
      ) : (
        <Table>
          <THead>
            <Th className="w-8">
              <input
                type="checkbox"
                checked={selected.size === filtered.length}
                onChange={toggleAll}
                className="h-3.5 w-3.5 rounded accent-mv-green"
              />
            </Th>
            <Th>{t("transactions.colDate")}</Th>
            <Th>{t("transactions.colDescription")}</Th>
            <Th>{t("transactions.colCategory")}</Th>
            <Th>{t("transactions.colAccount")}</Th>
            <Th className="text-right">{t("transactions.colAmount")}</Th>
            <Th>{t("transactions.colStatus")}</Th>
          </THead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    className="h-3.5 w-3.5 rounded accent-mv-green"
                  />
                </Td>
                <Td className="text-mv-ink-soft">{formatDate(row.date)}</Td>
                <Td className="font-medium">{row.description}</Td>
                <Td>
                  <Badge tone="neutral">{row.category}</Badge>
                </Td>
                <Td className="text-mv-ink-soft">{row.sourceAccount}</Td>
                <Td className={row.direction === "in" ? "text-right font-semibold text-mv-green-dark" : "text-right font-semibold text-mv-ink"}>
                  {row.direction === "in" ? "+" : ""}
                  {formatCurrency(row.amount)}
                </Td>
                <Td>
                  {row.reviewed ? (
                    <Badge tone="green">{t("transactions.statusReviewed")}</Badge>
                  ) : (
                    <Badge tone="amber">{t("transactions.statusToReview")}</Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Card className="mt-6">
        <CardHeader
          eyebrow={t("transactions.importEyebrow")}
          title={t("transactions.importTitle")}
          description={t("transactions.importDescription")}
        />
        <CsvDropzone onImported={refresh} />
      </Card>
    </div>
  );
}

/**
 * "Comptes" used to render a fully mocked connections list (no create
 * path existed anywhere in the codebase — the "Connecter un compte"
 * button had no onClick). A generic bank-account link needs a real
 * open-banking API we don't have; Square is the one POS connection that's
 * actually wired end-to-end, so this tab now shows the real thing instead
 * of a fake one.
 */
function AccountsTab() {
  return <PosConnectionsCard />;
}

function CategoriesTab({ expenseCategories }: { expenseCategories: ExpenseCategory[] }) {
  const t = useTranslations("finance.categories");
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createCategoryAction(newName);
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewName("");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        {expenseCategories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <Table>
            <THead>
              <Th>{t("colCategory")}</Th>
              <Th>{t("colType")}</Th>
              <Th className="text-right">{t("colTransactions")}</Th>
              <Th className="w-16" />
            </THead>
            <tbody>
              {expenseCategories.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>
                    <Badge tone={c.isDefault ? "neutral" : "lime"}>
                      {c.isDefault ? t("default") : t("custom")}
                    </Badge>
                  </Td>
                  <Td className="text-right text-mv-ink-soft">{c.transactionCount}</Td>
                  <Td>
                    <button className="flex h-7 w-7 items-center justify-center rounded-md text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink">
                      <Pencil size={13} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      <div className="lg:col-span-4">
        <Card>
          <CardHeader eyebrow={t("newEyebrow")} title={t("newTitle")} />
          <div className="flex flex-col gap-3">
            <Field label={t("nameLabel")}>
              <Input
                placeholder={t("namePlaceholder")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            {error && <p className="text-[12px] text-mv-red">{error}</p>}
            <Button disabled={!newName.trim() || creating} onClick={handleCreate}>
              {creating ? t("adding") : t("add")}
            </Button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-mv-ink-faint">
            {t("helperText")}
          </p>
        </Card>
      </div>
    </div>
  );
}

export function FinanceView({
  transactions,
  expenseCategories,
  connections,
}: {
  transactions: FinancialTransaction[];
  expenseCategories: ExpenseCategory[];
  connections: Connection[];
}) {
  const t = useTranslations("finance");
  return (
    <div>
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <Tabs defaultValue="apercu">
        <TabsList className="mb-6 h-auto rounded-full border border-mv-border bg-mv-cream-soft p-1">
          <TabsTrigger
            value="apercu"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            {t("tabs.overview")}
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            {t("tabs.transactions")}
          </TabsTrigger>
          <TabsTrigger
            value="comptes"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            {t("tabs.accounts")}
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            {t("tabs.categories")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu">
          <OverviewTab transactions={transactions} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab transactions={transactions} expenseCategories={expenseCategories} />
        </TabsContent>
        <TabsContent value="comptes">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab expenseCategories={expenseCategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
