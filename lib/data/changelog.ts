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

const DEFAULT_CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "ch-2026-07-23-3",
    title: "Version v2.5.0 : Recherche Cmd+K, Recharts Finance, Chat d'Équipe & Optimisations UX",
    description: "Publication officielle de la version v2.5.0. Intégration de la recherche globale Cmd+K avec historique et suggestions, refonte du Simulateur Financier avec graphiques Recharts dynamiques et typographie épurée, Chat d'équipe en direct avec bot @FlowAI, module d'incidents avec dictaphone, élimination totale du Cumulative Layout Shift (CLS) et transitions de pages fluides.",
    category: "fonctionnalite",
    publishedAt: new Date().toISOString(),
  },
  {
    id: "ch-2026-07-23-2",
    title: "Simulateur de Seuil de Rentabilité, Cloudflare AI Gateway & Refonte Minerva Flow",
    description: "Ajout du Simulateur de Seuil de Rentabilité & Point Mort en direct avec calculateur interactif de coûts fixes, panier moyen et marge nette. Intégration de Cloudflare AI Gateway (modèle Llama 3.3 70B), refonte visuelle du Chat IA sur le modèle Gemini Advanced, publication en direct Site Web ↔ Dashboard et extraction automatique de Favicon de marque d'URL.",
    category: "fonctionnalite",
    publishedAt: "2026-07-23T11:30:00.000Z",
  },
  {
    id: "ch-2026-07-23-1",
    title: "Correctif Auto-Refresh Jetons Google & Synchro 2 Sens Calendar",
    description: "Correction du bug d'expiration des jetons Google OAuth via rafraîchissement automatique par refresh_token. Activation de la synchronisation bidirectionnelle Google Calendar et intégration des avis Google Business Profile.",
    category: "correctif",
    publishedAt: "2026-07-23T09:30:00.000Z",
  },
  {
    id: "ch-2026-07-23-0",
    title: "Nouvelle Interface Authentification, Bibliothèque d'Assets & Hub Intégrations",
    description: "Refonte de l'authentification 2 colonnes avec OTP à 6 chiffres, ajout de la page Bibliothèque d'Assets (/library) et du hub d'Intégrations (/integrations).",
    category: "fonctionnalite",
    publishedAt: "2026-07-23T08:15:00.000Z",
  },
  {
    id: "ch-2026-07-16-1",
    title: "Gestion des Fournisseurs, Commandes & Ingrédients",
    description: "Ajout du module Fournisseurs avec génération de bons de commande, suivi du statut d'expédition et répercussion automatique dans l'inventaire et les dépenses.",
    category: "fonctionnalite",
    publishedAt: "2026-07-16T14:00:00.000Z",
  },
];

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("changelog_entries")
      .select("*")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) return DEFAULT_CHANGELOG_ENTRIES;
    const dbEntries = (data as ChangelogEntryRow[]).map(mapEntry);

    const existingIds = new Set(dbEntries.map((e) => e.id));
    const missingDefaults = DEFAULT_CHANGELOG_ENTRIES.filter((e) => !existingIds.has(e.id));
    return [...missingDefaults, ...dbEntries].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch {
    return DEFAULT_CHANGELOG_ENTRIES;
  }
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
