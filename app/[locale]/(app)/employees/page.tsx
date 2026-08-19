import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getEmployees } from "@/lib/data/employees";
import { EmployeesView } from "./EmployeesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("employees") };
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const restaurantId = await getCurrentRestaurantId();
  const employees = restaurantId ? await getEmployees(restaurantId) : [];
  const { id } = await searchParams;

  return (
    <EmployeesView
      restaurantId={restaurantId}
      employees={employees}
      initialSelectedId={id}
    />
  );
}
