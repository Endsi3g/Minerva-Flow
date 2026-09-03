export type DossierSlug = "menu" | "finance" | "loyalty" | "operations" | "custom";

export interface RestaurantDossier {
  slug: DossierSlug;
  name: string;
  description: string;
  icon: string;
}

export const DEFAULT_DOSSIERS: RestaurantDossier[] = [
  {
    slug: "menu",
    name: "Menu & Recettes",
    description: "Plats, ingrédients, coûts portions, fiches allergènes et ratios de marge",
    icon: "UtensilsCrossed",
  },
  {
    slug: "finance",
    name: "Finances & Performance",
    description: "Ventes Square/Lightspeed/Stripe, historique des jours de service et Prime Cost",
    icon: "TrendingUp",
  },
  {
    slug: "loyalty",
    name: "Fidélisation & Cohortes",
    description: "Clients Découverte, Habitués, Privilégiés, Ambassadeurs et taux de retour",
    icon: "HeartHandshake",
  },
  {
    slug: "operations",
    name: "Opérations & Équipe",
    description: "Horaires, collaborateurs, postes, SOPs d'ouverture et de fermeture",
    icon: "Users",
  },
  {
    slug: "custom",
    name: "Dossiers Personnalisés",
    description: "Notes libres, protocoles et procédures opérationnelles standard (SOPs)",
    icon: "FolderArchive",
  },
];
