import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserContact = {
  userId: string;
  email: string;
  fullName: string | null;
};

/**
 * Every user with at least one active restaurant membership, deduplicated —
 * the platform-wide "all staff users" audience (owners/managers/employees/
 * consultants), same population notifyAllUsers() targets for in-app/push.
 * Used to keep the Resend contacts list in sync for platform-wide email
 * campaigns (changelog announcements).
 */
export async function getActiveUserContacts(): Promise<UserContact[]> {
  const admin = createAdminClient();
  const { data: members } = await admin.from("restaurant_members").select("user_id").eq("status", "active");

  const userIds = Array.from(new Set(((members as { user_id: string }[]) ?? []).map((m) => m.user_id)));
  if (userIds.length === 0) return [];

  const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", userIds);

  return ((profiles as { id: string; email: string | null; full_name: string | null }[]) ?? [])
    .filter((p): p is { id: string; email: string; full_name: string | null } => Boolean(p.email))
    .map((p) => ({ userId: p.id, email: p.email, fullName: p.full_name }));
}
