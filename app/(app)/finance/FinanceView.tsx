"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
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
import { createCategoryAction, categorizeTransactionsAction } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
  reservation: CalendarCheck2,
};

const typeLabel: Record<ConnectionType, string> = {
  banque: "Compte bancaire",
  pos: "Point de vente",
  livraison: "Plateforme de livraison",
  email: "Outil email",
  reservation: "Plateforme de réservation",
};

const statusTone: Record<ConnectionStatus, "green" | "red" | "amber"> = {
  connecte: "green",
  erreur: "red",
  attente: "amber",
};

const statusLabel: Record<ConnectionStatus, string> = {
  connecte: "Connecté",
  erreur: "Erreur",
  attente: "En attente",
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
          label="Entrées"
          value={formatCurrency(totalIn)}
          icon={ArrowDownLeft}
          sublabel="ce mois-ci"
          accent="green"
        />
        <StatCard
          label="Sorties"
          value={formatCurrency(totalOut)}
          icon={ArrowUpRight}
          sublabel="ce mois-ci"
          accent="ink"
        />
        <StatCard
          label="Flux net"
          value={formatCurrency(net)}
          icon={Landmark}
          sublabel={totalIn > 0 ? `${Math.round((net / totalIn) * 100)}% des entrées` : "ce mois-ci"}
          accent="lime"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="D'où l'argent vient"
            title="Entrées de revenu"
            description="Répartition des sources d'encaissement"
          />
          {inflows.length > 0 ? (
            <FlowBars lines={inflows} tone="green" />
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">Aucune entrée ce mois-ci.</p>
          )}
        </Card>
        <Card>
          <CardHeader
            eyebrow="Où l'argent part"
            title="Sorties de charges"
            description="Répartition des dépenses courantes"
          />
          {outflows.length > 0 ? (
            <FlowBars lines={outflows} tone="ink" />
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">Aucune sortie ce mois-ci.</p>
          )}
        </Card>
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

function downloadCsv(rows: FinancialTransaction[]) {
  const header = ["Date", "Description", "Montant", "Sens", "Catégorie", "Compte", "Revu"];
  const lines = rows.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount,
    t.direction === "in" ? "Entrée" : "Sortie",
    t.category,
    t.sourceAccount,
    t.reviewed ? "Oui" : "Non",
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
  const [message, setMessage] = useState<string | null>(null);

  const props = useCsvTransactionImport({
    maxFiles: 1,
    maxFileSize: 5 * 1000 * 1000,
    onImported: (count) => {
      setMessage(`${count} transaction${count > 1 ? "s" : ""} importée${count > 1 ? "s" : ""}.`);
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

function TransactionsTab({
  transactions,
  expenseCategories,
}: {
  transactions: FinancialTransaction[];
  expenseCategories: ExpenseCategory[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | TransactionDirection>("all");
  const [category, setCategory] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);

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
            placeholder="Rechercher une transaction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-8"
          />
        </div>
        <Select className="w-auto" value={direction} onChange={(e) => setDirection(e.target.value as "all" | TransactionDirection)}>
          <option value="all">Entrées & sorties</option>
          <option value="in">Entrées seulement</option>
          <option value="out">Sorties seulement</option>
        </Select>
        <Select className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
          {unreviewedCount > 0 && ` · ${unreviewedCount} à revoir`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Select
                className="h-9 w-auto text-[12.5px]"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                <option value="">Choisir une catégorie…</option>
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
                <Tag size={14} /> Catégoriser ({selected.size})
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={() => downloadCsv(filtered)}>
            <Download size={14} /> Export CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => downloadQuickBooksCsv(filtered)}>
            <Download size={14} /> Exporter vers QuickBooks
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={transactions.length === 0 ? "Aucune transaction pour l'instant" : "Aucune transaction ne correspond"}
          description={
            transactions.length === 0
              ? "Importez un relevé CSV ci-dessous pour commencer."
              : "Essayez d'élargir la recherche ou les filtres."
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
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Catégorie</Th>
            <Th>Compte</Th>
            <Th className="text-right">Montant</Th>
            <Th>Statut</Th>
          </THead>
          <tbody>
            {filtered.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleOne(t.id)}
                    className="h-3.5 w-3.5 rounded accent-mv-green"
                  />
                </Td>
                <Td className="text-mv-ink-soft">{formatDate(t.date)}</Td>
                <Td className="font-medium">{t.description}</Td>
                <Td>
                  <Badge tone="neutral">{t.category}</Badge>
                </Td>
                <Td className="text-mv-ink-soft">{t.sourceAccount}</Td>
                <Td className={t.direction === "in" ? "text-right font-semibold text-mv-green-dark" : "text-right font-semibold text-mv-ink"}>
                  {t.direction === "in" ? "+" : ""}
                  {formatCurrency(t.amount)}
                </Td>
                <Td>
                  {t.reviewed ? (
                    <Badge tone="green">Revue</Badge>
                  ) : (
                    <Badge tone="amber">À revoir</Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Card className="mt-6">
        <CardHeader
          eyebrow="Import"
          title="Importer un relevé CSV"
          description="Glissez un export de votre banque ou POS pour ajouter des transactions."
        />
        <CsvDropzone onImported={refresh} />
      </Card>
    </div>
  );
}

function AccountsTab({ connections }: { connections: Connection[] }) {
  return (
    <Card>
      <CardHeader
        title="Connexions"
        description="Comptes bancaires, caisses et plateformes reliés à Minerva Flow"
        action={
          <Button size="sm" variant="secondary">
            <Plus size={15} /> Connecter un compte
          </Button>
        }
      />
      {connections.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">Aucune connexion configurée pour l&apos;instant.</p>
      ) : (
        <div className="divide-y divide-mv-border-soft">
          {connections.map((c) => {
            const Icon = typeIcon[c.type];
            return (
              <div key={c.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mv-cream-soft text-mv-ink-soft">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-mv-ink">{c.name}</p>
                  <p className="text-[12px] text-mv-ink-faint">
                    {typeLabel[c.type]} · {c.lastSync}
                  </p>
                  {c.detail && <p className="mt-0.5 text-[12px] text-mv-red">{c.detail}</p>}
                </div>
                <Badge tone={statusTone[c.status]} dot>
                  {statusLabel[c.status]}
                </Badge>
                {c.status === "erreur" && (
                  <Button size="sm" variant="secondary">
                    <RefreshCw size={13} /> Reconnecter
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CategoriesTab({ expenseCategories }: { expenseCategories: ExpenseCategory[] }) {
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
            title="Aucune catégorie"
            description="Ajoutez votre première catégorie de dépense à droite."
          />
        ) : (
          <Table>
            <THead>
              <Th>Catégorie</Th>
              <Th>Type</Th>
              <Th className="text-right">Transactions</Th>
              <Th className="w-16" />
            </THead>
            <tbody>
              {expenseCategories.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>
                    <Badge tone={c.isDefault ? "neutral" : "lime"}>
                      {c.isDefault ? "Par défaut" : "Personnalisée"}
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
          <CardHeader eyebrow="Nouvelle catégorie" title="Ajouter une catégorie" />
          <div className="flex flex-col gap-3">
            <Field label="Nom">
              <Input
                placeholder="Ex : Réparations"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            {error && <p className="text-[12px] text-mv-red">{error}</p>}
            <Button disabled={!newName.trim() || creating} onClick={handleCreate}>
              {creating ? "Ajout…" : "Ajouter"}
            </Button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-mv-ink-faint">
            Les catégories permettent de regrouper vos transactions pour analyser où va l'argent.
            Fusionnez deux catégories en glissant l'une sur l'autre depuis la liste.
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
  return (
    <div>
      <PageHeader
        eyebrow="Flux financiers"
        title="Finance"
        description="D'où vient l'argent, où il part, et l'état de vos connexions bancaires et plateformes."
      />

      <Tabs defaultValue="apercu">
        <TabsList className="mb-6 h-auto rounded-full border border-mv-border bg-mv-cream-soft p-1">
          <TabsTrigger
            value="apercu"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Aperçu
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger
            value="comptes"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Comptes & Intégrations
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Catégories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu">
          <OverviewTab transactions={transactions} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab transactions={transactions} expenseCategories={expenseCategories} />
        </TabsContent>
        <TabsContent value="comptes">
          <AccountsTab connections={connections} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab expenseCategories={expenseCategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
