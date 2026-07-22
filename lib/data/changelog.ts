import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChangelogCategory = "fonctionnalite" | "amelioration" | "correctif";

export type ChangelogEntry = {
  id: string;
  title: string;
  description: string;
  category: ChangelogCategory;
  publishedAt: string;
};

type ChangelogEntryRow = {
  id: string;
  title: string;
  description: string;
  category: ChangelogCategory;
  published_at: string;
};

function mapEntry(row: ChangelogEntryRow): ChangelogEntry {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    publishedAt: row.published_at,
  };
}

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("changelog_entries")
    .select("*")
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as ChangelogEntryRow[]).map(mapEntry);
}

export type CreateChangelogEntryInput = {
  title: string;
  description: string;
  category: ChangelogCategory;
};

export async function createChangelogEntry(input: CreateChangelogEntryInput): Promise<ChangelogEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("changelog_entries")
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapEntry(data as ChangelogEntryRow);
}

/**
 * Publishes a changelog entry with no authenticated session — used by the
 * GitHub release webhook, which has no user to bind to `created_by` or to
 * check against the `changelog_entries_admin_insert` RLS policy. Uses the
 * service-role client instead, same trust boundary as a cron route: the
 * caller (the route handler) is what gates this on a bearer secret, not
 * RLS.
 */
export async function createChangelogEntryAsSystem(input: CreateChangelogEntryInput): Promise<ChangelogEntry | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("changelog_entries")
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      created_by: null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapEntry(data as ChangelogEntryRow);
}
