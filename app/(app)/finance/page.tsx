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
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import {
  inflows,
  outflows,
  connections,
  financialTransactions,
  expenseCategories,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ConnectionStatus, ConnectionType, TransactionDirection } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Bike,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Download,
  ReceiptText,
  Tag,
  Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
};

const typeLabel: Record<ConnectionType, string> = {
  banque: "Compte bancaire",
  pos: "Point de vente",
  livraison: "Plateforme de livraison",
  email: "Outil email",
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

function OverviewTab() {
  const totalIn = inflows.reduce((s, l) => s + l.amount, 0);
  const totalOut = outflows.reduce((s, l) => s + l.amount, 0);
  const net = totalIn - totalOut;

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
          sublabel={`${Math.round((net / totalIn) * 100)}% des entrées`}
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
          <FlowBars lines={inflows} tone="green" />
        </Card>
        <Card>
          <CardHeader
            eyebrow="Où l'argent part"
            title="Sorties de charges"
            description="Répartition des dépenses courantes"
          />
          <FlowBars lines={outflows} tone="ink" />
        </Card>
      </div>
    </div>
  );
}

function downloadCsv(rows: typeof financialTransactions) {
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
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-minerva-flow-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TransactionsTab() {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | TransactionDirection>("all");
  const [category, setCategory] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return financialTransactions.filter((t) => {
      if (direction !== "all" && t.direction !== direction) return false;
      if (category !== "all" && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, direction, category]);

  const unreviewedCount = financialTransactions.filter((t) => !t.reviewed).length;

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
            <Button size="sm" variant="secondary">
              <Tag size={14} /> Catégoriser ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => downloadCsv(filtered)}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aucune transaction ne correspond"
          description="Essayez d'élargir la recherche ou les filtres."
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
        <CsvDropzone />
      </Card>
    </div>
  );
}

function CsvDropzone() {
  const props = useSupabaseUpload({
    bucketName: "statements",
    allowedMimeTypes: ["text/csv"],
    maxFiles: 1,
    maxFileSize: 5 * 1000 * 1000,
  });

  return (
    <Dropzone {...props}>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  );
}

function AccountsTab() {
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
    </Card>
  );
}

function CategoriesTab() {
  const [newName, setNewName] = useState("");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
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
            <Button disabled={!newName.trim()}>Ajouter</Button>
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

export default function FinancePage() {
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
          <OverviewTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="comptes">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
