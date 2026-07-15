import { createClient } from "@/lib/supabase/server";

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
