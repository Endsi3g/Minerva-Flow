import { notFound } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransaction } from "@/lib/data/finance";
import { createClient } from "@/lib/supabase/server";
import { ExpenseDetailView } from "./ExpenseDetailView";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) notFound();

  const transaction = await getFinancialTransaction(restaurantId, id);
  if (!transaction) notFound();

  const supabase = await createClient();
  const userIds = [transaction.createdBy, transaction.updatedBy].filter((v): v is string => Boolean(v));
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
      names.set(p.id, p.full_name ?? "—");
    }
  }

  return (
    <ExpenseDetailView
      transaction={transaction}
      createdByName={transaction.createdBy ? (names.get(transaction.createdBy) ?? "—") : null}
      updatedByName={transaction.updatedBy ? (names.get(transaction.updatedBy) ?? "—") : null}
    />
  );
}
