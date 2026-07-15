"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  assignRestaurantToCompany,
  getUserCompanies,
  getCompanyRestaurants,
} from "@/lib/data/companies";
import {
  createRestaurant,
  updateRestaurant,
  type RestaurantInput,
} from "@/lib/data/restaurants";
import { getConnections, createConnection } from "@/lib/data/finance";
import { getAlertRules, upsertAlertRule } from "@/lib/data/alerts";
import type {
  AlertRule,
  AlertRuleType,
  Company,
  Connection,
  ConnectionType,
  Restaurant,
} from "@/lib/types";

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

export async function createRestaurantAction(input: RestaurantInput): Promise<Restaurant | null> {
  const restaurant = await createRestaurant(input);
  if (restaurant) revalidatePath("/workspace");
  return restaurant;
}

export async function updateRestaurantAction(
  id: string,
  patch: Partial<RestaurantInput>
): Promise<Restaurant | null> {
  const restaurant = await updateRestaurant(id, patch);
  if (restaurant) revalidatePath("/workspace");
  return restaurant;
}

export async function getConnectionsAction(restaurantId: string): Promise<Connection[]> {
  return getConnections(restaurantId);
}

export async function createConnectionAction(
  restaurantId: string,
  input: { name: string; type: ConnectionType }
): Promise<Connection | null> {
  const connection = await createConnection(restaurantId, input);
  if (connection) revalidatePath("/settings");
  return connection;
}

export async function getAlertRulesAction(restaurantId: string): Promise<AlertRule[]> {
  return getAlertRules(restaurantId);
}

export async function upsertAlertRuleAction(
  restaurantId: string,
  type: AlertRuleType,
  patch: { threshold?: number; enabled?: boolean; notify?: boolean }
): Promise<AlertRule | null> {
  const rule = await upsertAlertRule(restaurantId, type, patch);
  if (rule) revalidatePath("/settings");
  return rule;
}
