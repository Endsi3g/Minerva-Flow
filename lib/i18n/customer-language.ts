import type { SupabaseClient } from "@supabase/supabase-js";

/** Language of emails and notifications sent to a customer (customers.preferred_language). */
export type CustomerLanguage = "fr" | "en";

export function parseCustomerLanguage(value: unknown): CustomerLanguage {
  return value === "en" ? "en" : "fr";
}

/** Reads the customer's language; any failure falls back to French, the default. */
export async function getCustomerLanguage(admin: SupabaseClient, customerId: string | null | undefined): Promise<CustomerLanguage> {
  if (!customerId) return "fr";
  const { data } = await admin.from("customers").select("preferred_language").eq("id", customerId).maybeSingle();
  return parseCustomerLanguage((data as { preferred_language?: string } | null)?.preferred_language);
}
