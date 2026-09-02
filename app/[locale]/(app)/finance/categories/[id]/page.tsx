import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getExpenseCategories, getFinancialTransactions } from "@/lib/data/finance";
import { getCategoryAction } from "../../actions";
import { CategoryDetailView } from "./CategoryDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const category = await getCategoryAction(id);
  return { title: category?.name ?? "Catégorie" };
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const category = restaurantId ? await getCategoryAction(id) : null;

  if (!restaurantId || !category) notFound();

  const [allTransactions, allCategories] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
  ]);

  const transactions = allTransactions.filter((t) => t.category === category.name);
  const otherTransactions = allTransactions.filter((t) => t.category !== category.name);

  return (
    <CategoryDetailView
      category={category}
      transactions={transactions}
      assignableTransactions={otherTransactions}
      otherCategoryNames={allCategories.filter((c) => c.id !== category.id).map((c) => c.name)}
    />
  );
}
