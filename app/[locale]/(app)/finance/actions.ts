"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import {
  createExpenseCategory,
  createFinancialTransaction,
  importFinancialTransactions,
  bulkCategorizeTransactions,
  type TransactionInput,
} from "@/lib/data/finance";
import type { ExpenseCategory, FinancialTransaction } from "@/lib/types";

/**
 * Every action below derives the restaurant from the current session's
 * cookie (same source as AppLayout / AppProvider), never from a
 * client-supplied id — RLS still backs this up, but we don't trust the
 * caller to name which restaurant it's allowed to mutate.
 */
async function requireRestaurantId(): Promise<string> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) throw new Error("Aucun restaurant actif pour cet utilisateur.");
  return restaurantId;
}

export async function createCategoryAction(
  name: string
): Promise<{ ok: true; category: ExpenseCategory } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Le nom de la catégorie est requis." };

  const restaurantId = await requireRestaurantId();
  const category = await createExpenseCategory(restaurantId, trimmed);
  if (!category) return { ok: false, error: "Impossible de créer la catégorie." };

  revalidatePath("/finance");
  return { ok: true, category };
}

export async function createTransactionAction(
  input: TransactionInput
): Promise<FinancialTransaction | null> {
  if (!input.description.trim() || !input.date) return null;

  const restaurantId = await requireRestaurantId();
  const transaction = await createFinancialTransaction(restaurantId, { ...input, reviewed: true });
  if (transaction) {
    revalidatePath("/finance");
    revalidatePath("/depenses");
  }
  return transaction;
}

export async function importTransactionsAction(rows: TransactionInput[]): Promise<number> {
  if (rows.length === 0) return 0;

  const restaurantId = await requireRestaurantId();
  const inserted = await importFinancialTransactions(restaurantId, rows);
  if (inserted > 0) revalidatePath("/finance");
  return inserted;
}

export async function categorizeTransactionsAction(
  ids: string[],
  category: string
): Promise<number> {
  const trimmed = category.trim();
  if (ids.length === 0 || !trimmed) return 0;

  const restaurantId = await requireRestaurantId();
  const updated = await bulkCategorizeTransactions(restaurantId, ids, trimmed);
  if (updated > 0) revalidatePath("/finance");
  return updated;
}
