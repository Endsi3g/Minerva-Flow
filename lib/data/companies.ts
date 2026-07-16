import { createClient } from "@/lib/supabase/server";
import type { Company, Restaurant } from "@/lib/types";

type CompanyRow = {
  id: string;
  name: string;
  created_at: string;
};

function mapCompany(row: CompanyRow): Company {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

/**
 * Companies the current authenticated user is an active member of,
 * via company_members. Returns an empty array if not signed in.
 */
export async function getUserCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("company_members")
    .select("company:companies(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .map((row) => row.company as unknown as CompanyRow | null)
    .filter((c): c is CompanyRow => Boolean(c))
    .map(mapCompany);
}

/**
 * Restaurants belonging to a company — relies on the restaurants RLS policy
 * (restaurants_member_select) already allowing company members through.
 */
export async function getCompanyRestaurants(companyId: string): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error || !data) return [];

  // Mirrors mapRestaurant() in lib/data/restaurants.ts — kept local to avoid
  // exporting that module's private row type just for this one call site.
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    province: row.province ?? "QC",
    postalCode: row.postal_code,
    timezone: row.timezone,
    currency: row.currency,
    serviceModel: row.service_model,
    operatingDays: row.operating_days ?? [],
    color: row.color ?? "var(--mv-green)",
    lng: row.lng,
    lat: row.lat,
    companyId: row.company_id,
    loyaltyPointsPerDollar: row.loyalty_points_per_dollar ?? 1,
    taxRate: row.tax_rate ?? 0.14975,
    acceptsTips: row.accepts_tips ?? true,
  }));
}

/**
 * Creates a company and immediately makes the current user its owner.
 * The company_members insert relies on the bootstrap escape hatch in
 * 0003_companies.sql (`user_id = auth.uid()`) since no membership row
 * exists yet at insert time.
 */
export async function createCompany(name: string): Promise<Company | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !name.trim()) return null;

  const { data: company, error } = await supabase
    .from("companies")
    .insert({ name: name.trim() })
    .select("*")
    .single();

  if (error || !company) return null;

  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) return null;

  return mapCompany(company as CompanyRow);
}

/** Links an existing restaurant (that the user owns/manages) to a company. */
export async function assignRestaurantToCompany(
  restaurantId: string,
  companyId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ company_id: companyId })
    .eq("id", restaurantId);

  return !error;
}
