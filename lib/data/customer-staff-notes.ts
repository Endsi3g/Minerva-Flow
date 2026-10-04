import { createClient } from "@/lib/supabase/server";

export const STAFF_NOTE_MAX_LENGTH = 2000;

/** Normalises a note before saving: unified line breaks, trimmed, length-capped. */
export function sanitizeStaffNote(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").trim().slice(0, STAFF_NOTE_MAX_LENGTH);
}

export type CustomerStaffNote = { body: string; updatedAt: string | null };

/** Row-level security limits reads to owner/manager/staff of the restaurant. */
export async function getCustomerStaffNote(customerId: string): Promise<CustomerStaffNote> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_staff_notes")
    .select("body, updated_at")
    .eq("customer_id", customerId)
    .maybeSingle();
  return { body: data?.body ?? "", updatedAt: data?.updated_at ?? null };
}

export async function saveCustomerStaffNote(
  restaurantId: string,
  customerId: string,
  rawBody: string
): Promise<boolean> {
  const body = sanitizeStaffNote(rawBody);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  if (body === "") {
    const { error } = await supabase.from("customer_staff_notes").delete().eq("customer_id", customerId);
    return !error;
  }
  const { error } = await supabase.from("customer_staff_notes").upsert(
    {
      customer_id: customerId,
      restaurant_id: restaurantId,
      body,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_id" }
  );
  return !error;
}
