import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { formatRelativeTime } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
  ExpenseCategory,
  FinancialTransaction,
  TransactionDirection,
} from "@/lib/types";

type TransactionRow = {
  id: string;
  restaurant_id: string;
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  category: string;
  source_account: string;
  program_id: string | null;
  reviewed: boolean;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

function mapTransaction(row: TransactionRow): FinancialTransaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    category: row.category,
    sourceAccount: row.source_account,
    programId: row.program_id,
    reviewed: row.reviewed,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function getFinancialTransaction(restaurantId: string, id: string): Promise<FinancialTransaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapTransaction(data as TransactionRow);
}

export async function getFinancialTransactions(
  restaurantId: string,
  opts?: { from?: string; to?: string; direction?: TransactionDirection },
  client?: SupabaseClient
): Promise<FinancialTransaction[]> {
  const supabase = client ?? (await createClient());
  let query = supabase
    .from("financial_transactions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (opts?.from) query = query.gte("date", opts.from);
  if (opts?.to) query = query.lte("date", opts.to);
  if (opts?.direction) query = query.eq("direction", opts.direction);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as TransactionRow[]).map(mapTransaction);
}

export type TransactionInput = {
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  category: string;
  sourceAccount: string;
  programId?: string | null;
  reviewed?: boolean;
};

export async function createFinancialTransaction(
  restaurantId: string,
  input: TransactionInput
): Promise<FinancialTransaction | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      restaurant_id: restaurantId,
      date: input.date,
      description: input.description,
      amount: input.amount,
      direction: input.direction,
      category: input.category,
      source_account: input.sourceAccount,
      program_id: input.programId ?? null,
      reviewed: input.reviewed ?? false,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "transaction.create",
    entityType: "financial_transaction",
    entityId: data.id,
    description: `A ajouté une transaction : "${input.description}"`,
  });

  return mapTransaction(data as TransactionRow);
}

/**
 * Bulk-inserts transactions parsed from an imported CSV statement and logs
 * a single activity entry summarizing the import (rather than one per row).
 */
export async function importFinancialTransactions(
  restaurantId: string,
  rows: TransactionInput[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(
      rows.map((r) => ({
        restaurant_id: restaurantId,
        date: r.date,
        description: r.description,
        amount: r.amount,
        direction: r.direction,
        category: r.category,
        source_account: r.sourceAccount,
        program_id: r.programId ?? null,
        reviewed: r.reviewed ?? false,
      }))
    )
    .select("id");

  if (error || !data) return 0;

  await logActivity({
    restaurantId,
    actionType: "transaction.import",
    entityType: "financial_transaction",
    description: `A importé ${data.length} transaction${data.length > 1 ? "s" : ""} depuis un CSV`,
  });

  return data.length;
}

/**
 * Applies one category to many transactions at once (the "Catégoriser (N)"
 * bulk action) and logs a single activity entry for the batch.
 */
export async function bulkCategorizeTransactions(
  restaurantId: string,
  ids: string[],
  category: string
): Promise<number> {
  if (ids.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ category })
    .eq("restaurant_id", restaurantId)
    .in("id", ids)
    .select("id");

  if (error || !data) return 0;

  await logActivity({
    restaurantId,
    actionType: "transaction.categorize",
    entityType: "financial_transaction",
    description: `A catégorisé ${data.length} transaction${data.length > 1 ? "s" : ""} en "${category}"`,
  });

  return data.length;
}

export async function updateFinancialTransaction(
  restaurantId: string,
  id: string,
  patch: Partial<TransactionInput>
): Promise<FinancialTransaction | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.direction !== undefined) dbPatch.direction = patch.direction;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.sourceAccount !== undefined) dbPatch.source_account = patch.sourceAccount;
  if (patch.programId !== undefined) dbPatch.program_id = patch.programId;
  if (patch.reviewed !== undefined) dbPatch.reviewed = patch.reviewed;
  dbPatch.updated_by = user?.id ?? null;
  dbPatch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("financial_transactions")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "transaction.update",
    entityType: "financial_transaction",
    entityId: id,
    description: `A modifié une transaction : "${data.description}"`,
  });

  return mapTransaction(data as TransactionRow);
}

export async function deleteFinancialTransaction(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_transactions").delete().eq("restaurant_id", restaurantId).eq("id", id);
  if (!error) {
    await logActivity({
      restaurantId,
      actionType: "transaction.delete",
      entityType: "financial_transaction",
      entityId: id,
      description: "A supprimé une transaction",
    });
  }
  return !error;
}

type ExpenseCategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
};

const UNCATEGORIZED_LABEL = "Non catégorisé";

export async function getExpenseCategories(restaurantId: string): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const [{ data: categories, error }, { data: transactions }] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("financial_transactions")
      .select("category")
      .eq("restaurant_id", restaurantId)
      .eq("direction", "out"),
  ]);

  if (error || !categories) return [];

  const counts = new Map<string, number>();
  for (const t of (transactions as { category: string }[]) ?? []) {
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }

  return (categories as ExpenseCategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default,
    transactionCount: counts.get(row.name) ?? 0,
  }));
}

export async function getExpenseCategory(restaurantId: string, id: string): Promise<ExpenseCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ExpenseCategoryRow;

  const { count } = await supabase
    .from("financial_transactions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("category", row.name);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default,
    transactionCount: count ?? 0,
  };
}

export async function createExpenseCategory(
  restaurantId: string,
  name: string
): Promise<ExpenseCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ restaurant_id: restaurantId, name, is_default: false })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "expense_category.create",
    entityType: "expense_category",
    entityId: data.id,
    description: `A ajouté la catégorie de dépense "${name}"`,
  });

  return { id: data.id, name: data.name, description: data.description, isDefault: data.is_default, transactionCount: 0 };
}

/**
 * Renaming a category doesn't cascade automatically — financial_transactions
 * matches categories by name text, not a foreign key (see NewTransactionModal
 * writing `category: c.name`) — so a plain rename would silently orphan
 * every transaction already filed under the old name. Updates both in the
 * same call so nothing goes uncategorized just because someone fixed a typo.
 */
export async function updateExpenseCategory(
  restaurantId: string,
  id: string,
  patch: { name?: string; description?: string | null }
): Promise<boolean> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("expense_categories")
    .select("name, is_default")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();
  if (!existing) return false;

  const updates: { name?: string; description?: string | null } = {};
  if (patch.name !== undefined && patch.name.trim() && patch.name.trim() !== existing.name) {
    updates.name = patch.name.trim();
  }
  if (patch.description !== undefined) updates.description = patch.description;
  if (Object.keys(updates).length === 0) return true;

  const { error } = await supabase.from("expense_categories").update(updates).eq("id", id);
  if (error) return false;

  if (updates.name) {
    await supabase
      .from("financial_transactions")
      .update({ category: updates.name })
      .eq("restaurant_id", restaurantId)
      .eq("category", existing.name);
  }

  await logActivity({
    restaurantId,
    actionType: "expense_category.update",
    entityType: "expense_category",
    entityId: id,
    description: updates.name
      ? `A renommé la catégorie de dépense "${existing.name}" en "${updates.name}"`
      : `A mis à jour la catégorie de dépense "${existing.name}"`,
  });

  return true;
}

/**
 * Default (system-seeded) categories can't be deleted — matches the "Défaut"
 * vs "Personnalisée" badge already shown in the UI. A custom category's
 * transactions are reassigned to "Non catégorisé" rather than deleted along
 * with it — a real expense record disappearing because someone tidied up a
 * category label would be a much worse surprise than an uncategorized one.
 */
export async function deleteExpenseCategory(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("expense_categories")
    .select("name, is_default")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.is_default) return false;

  await supabase
    .from("financial_transactions")
    .update({ category: UNCATEGORIZED_LABEL })
    .eq("restaurant_id", restaurantId)
    .eq("category", existing.name);

  const { error } = await supabase.from("expense_categories").delete().eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "expense_category.delete",
    entityType: "expense_category",
    entityId: id,
    description: `A supprimé la catégorie de dépense "${existing.name}"`,
  });

  return true;
}

type ConnectionRow = {
  id: string;
  restaurant_id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  last_sync: string | null;
  detail: string | null;
  created_at: string;
};

function mapConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    lastSync: row.last_sync ? formatRelativeTime(row.last_sync) : "jamais synchronisé",
    detail: row.detail ?? undefined,
  };
}

export async function getConnections(restaurantId: string, client?: SupabaseClient): Promise<Connection[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as ConnectionRow[]).map(mapConnection);
}

export async function createConnection(
  restaurantId: string,
  input: { name: string; type: ConnectionType }
): Promise<Connection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connections")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      type: input.type,
      status: "attente",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "connection.create",
    entityType: "connection",
    entityId: data.id,
    description: `A ajouté l'intégration "${input.name}"`,
  });

  return mapConnection(data as ConnectionRow);
}
