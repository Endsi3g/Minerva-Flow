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
    id: "ch-2026-07-24-v2-9-3",
    title: "Version v2.9.3 : Correctifs Dark Mode Calendrier, Support Mobile 375px & Personnalisation des Widgets",
    description: `- **Calendrier & Dark Mode** : Correction du contraste de texte en mode sombre (\`/horaire\` & \`MonthCalendar.tsx\`) et bascule vers une vue à puces d'indicateur sur mobile (< 640px).
- **Carte Interactive (\`/maps\`)** : Hauteur explicite de 420px sur mobile empêchant l'effondrement de la carte et repositionnement des contrôles.
- **Personnalisation des Widgets (\`/overview\`)** : Panneau **« Personnaliser mes widgets »** (\`WidgetManagerModal.tsx\`) avec toggles On/Off sauvegardés.`,
    category: "correctif",
    publishedAt: "2026-07-24T13:53:00.000Z",
  },
  {
    id: "ch-2026-07-24-v2-9-2",
    title: "Version v2.9.2 : Sélecteur de Profils de Trafic (Calme, Normal, Rush, Événementiel) pour simulate-analytics.ts",
    description: `- **Sélection Interactive** : Choix du profil de trafic au lancement en terminal (Options 1 à 5).
- **Arguments CLI** : Support direct des flags \`npx tsx scripts/simulate-analytics.ts --profile=calme|normal|rush|evenement|history-only\`.
- **Profils configurés** :
  - 🟢 **Calme** : 8 vis./jour, pause 90-180s.
  - 🟡 **Normal** : 25 vis./jour, pause 40-80s.
  - 🔴 **Rush** : 80 vis./jour, pause 15-35s.
  - ⚡ **Événementiel** : 200 vis./jour, pause 5-15s.`,
    category: "amelioration",
    publishedAt: "2026-07-24T13:31:00.000Z",
  },
  {
    id: "ch-2026-07-24-v2-9-0",
    title: "Version v2.9.0 : Commande Directe 0%, Hub POS Unifié & Studio Marketing Visuel",
    description: `- **Commande Directe 0%** : Calculateur d'économies vs commissions Uber Eats (20-30%) et générateur de widget \`<iframe>\` web & badges QR code table (\`/commandes\` & \`/etablissement\`).
- **Hub POS & Stocks** : Synchronisation POS automatique (Square, Clover, Lightspeed) avec déduction des stocks en temps réel et alignement masse salariale/chiffre d'affaires (\`/integrations\`).
- **Studio Marketing Visuel** : Éditeur 1-Click de visuels Instagram (Story 9:16, Post 1:1, Carrousel 4:5) ultra-personnalisable et règles de relance automatique SMS/Email des clients inactifs (\`/campaigns\`).`,
    category: "fonctionnalite",
    publishedAt: "2026-07-24T13:00:00.000Z",
  },
  {
    id: "ch-2026-07-24-v2-8-0",
    title: "Version v2.8.0 : Calendrier Mensuel d'Équipe Interactif pour les Horaires",
    description: `- **Vue Calendrier Mensuel** : Grille 7 jours avec mise en avant du jour actuel, indicateurs de quarts et modale de détail par jour (\`/horaire\`).
- **Planification Rapide** : Bouton d'ajout rapide au survol des cellules et bascule fluide vers le planning hebdomadaire.`,
    category: "amelioration",
    publishedAt: "2026-07-24T01:45:00.000Z",
  },
  {
    id: "ch-2026-07-24-v2-7-0",
    title: "Version v2.7.0 : Chat d'Équipe Realtime, Soft-Delete & Droits d'Accès aux Canaux",
    description: `- **Supabase Realtime Chat** : Mise à jour en direct des messages sans rechargement (\`/collaborateurs\`).
- **Identité & Modération** : Logo Flow AI officiel, avatars d'utilisateurs connectés, suppression propre (soft-delete) et tiroir d'accès aux canaux.`,
    category: "fonctionnalite",
    publishedAt: "2026-07-24T01:15:00.000Z",
  },
  {
    id: "ch-2026-07-23-3",
    title: "Version v2.5.0 : Recherche Cmd+K, Recharts Finance & Assistant @FlowAI",
    description: `- **Recherche Globale Cmd+K** : Recherche instantanée dans l'application avec historique et suggestions.
- **Simulateur Financier Recharts** : Graphiques interactifs de marge et de seuil de rentabilité.
- **Optimisations CLS & UX** : Suppression des sauts de mise en page et transitions fluides.`,
    category: "fonctionnalite",
    publishedAt: "2026-07-23T18:00:00.000Z",
  },
  {
    id: "ch-2026-07-23-2",
    title: "Simulateur de Seuil de Rentabilité & Cloudflare AI Gateway",
    description: `- **Point Mort & Rentabilité** : Calculateur interactif de coûts fixes, panier moyen et marge nette.
- **Cloudflare AI Gateway** : Optimisation et mise en cache des prompts LLM Llama 3.3 70B.
- **Refonte Chat IA** : Interface inspirée de Gemini Advanced avec gestion des pièces jointes.`,
    category: "fonctionnalite",
    publishedAt: "2026-07-23T11:30:00.000Z",
  },
  {
    id: "ch-2026-07-23-1",
    title: "Correctif Auto-Refresh Jetons Google & Synchro 2 Sens Calendar",
    description: `- **Google OAuth Auto-Refresh** : Rafraîchissement automatique des jetons d'accès via \`refresh_token\`.
- **Google Calendar Sync** : Synchronisation bidirectionnelle des événements et avis Google Business Profile.`,
    category: "correctif",
    publishedAt: "2026-07-23T09:30:00.000Z",
  },
  {
    id: "ch-2026-07-23-0",
    title: "Nouvelle Interface Authentification, Bibliothèque d'Assets & Hub Intégrations",
    description: `- **Authentification 2 Colonnes** : Connexion moderne avec OTP 6 chiffres.
- **Bibliothèque d'Assets (\`/library\`)** : Gestionnaire de fichiers et ressources médias.
- **Hub Intégrations (\`/integrations\`)** : Connexions Square, Stripe, Meta Ads & Google Workspace.`,
    category: "fonctionnalite",
    publishedAt: "2026-07-23T08:15:00.000Z",
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
