"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  assignRestaurantToCompany,
  getUserCompanies,
  getCompanyRestaurants,
} from "@/lib/data/companies";
import type { Company, Restaurant } from "@/lib/types";

export async function getCompaniesWithRestaurantsAction(): Promise<
  { company: Company; restaurants: Restaurant[] }[]
> {
  const companies = await getUserCompanies();
  return Promise.all(
    companies.map(async (company) => ({
      company,
      restaurants: await getCompanyRestaurants(company.id),
    }))
  );
}

export async function createCompanyAction(name: string): Promise<Company | null> {
  if (!name.trim()) return null;
  const company = await createCompany(name);
  if (company) revalidatePath("/settings");
  return company;
}

export async function assignRestaurantToCompanyAction(
  restaurantId: string,
  companyId: string
): Promise<boolean> {
  const ok = await assignRestaurantToCompany(restaurantId, companyId);
  if (ok) revalidatePath("/settings");
  return ok;
}
