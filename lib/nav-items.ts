import type { Role } from "@/lib/types";

/**
 * The single canonical list of navigable pages — title, short description,
 * href, and which roles can see it. Used by both the global search
 * (search-actions.ts, for query matches) and SearchDialog's "suggested
 * pages" list shown before you type anything.
 *
 * Kept separate from AppSidebar.tsx's own nav arrays (icon-bearing, used
 * for the sidebar's own rendering) so this stays importable from a server
 * action without pulling a "use client" file's icon graph along with it.
 * Before this, search-actions.ts and the old GlobalSearchModal each kept
 * their own hardcoded copy — both had drifted out of date (missing Impact,
 * Vue franchise) independently. This is the fix: one list, everyone reads it.
 */
export type SearchableNavItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  roles: Role[];
};

const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];
const managerRoles: Role[] = ["owner", "manager"];

export const NAV_ITEMS: SearchableNavItem[] = [
  { key: "overview", href: "/overview", title: "Aperçu", subtitle: "Tableau de bord principal", roles: allRoles },
  { key: "assistant", href: "/assistant", title: "Flow AI", subtitle: "Assistant IA conversationnel", roles: allRoles },
  { key: "franchise", href: "/franchise", title: "Vue franchise", subtitle: "Résultats combinés sur vos établissements", roles: managerRoles },
  { key: "impact", href: "/impact", title: "Résultats fidélisation", subtitle: "Ce que la fidélisation vous rapporte, et qui relancer", roles: managerRoles },
  { key: "fidelisation", href: "/fidelisation", title: "Fidélisation", subtitle: "Fiches clients, visites et points de fidélité", roles: allRoles },
  { key: "menu", href: "/menu", title: "Menu", subtitle: "Rentabilité et popularité de chaque plat", roles: allRoles },
  { key: "finance", href: "/finance", title: "Finance", subtitle: "Transactions, revenus et seuil de rentabilité", roles: managerRoles },
  { key: "commandes", href: "/commandes", title: "Commandes", subtitle: "File de commandes en ligne et cuisine", roles: allRoles },
  { key: "collaborateurs", href: "/collaborateurs", title: "Collaborateurs", subtitle: "Membres de l'équipe et permissions", roles: allRoles },
  { key: "inventaire", href: "/inventaire", title: "Inventaire", subtitle: "Quantités en main et suivi du gaspillage", roles: managerRoles },
  { key: "horaire", href: "/horaire", title: "Horaire", subtitle: "Planification des quarts de l'équipe", roles: allRoles },
  { key: "fournisseurs", href: "/fournisseurs", title: "Fournisseurs", subtitle: "Commandes et répertoire de fournisseurs", roles: managerRoles },
  { key: "reservations", href: "/reservations", title: "Réservations", subtitle: "Réservations et assignation des tables", roles: allRoles },
  { key: "monEspace", href: "/mon-espace", title: "Mon espace", subtitle: "Votre horaire et vos informations", roles: allRoles },
  { key: "employees", href: "/employees", title: "Employés", subtitle: "Liste des employés et revues de performance", roles: managerRoles },
  { key: "days", href: "/days", title: "Performance quotidienne", subtitle: "Suivi des performances journalières", roles: allRoles },
  { key: "reports", href: "/reports", title: "Rapports", subtitle: "Seuil de rentabilité, food cost, journées", roles: allRoles },
  { key: "maps", href: "/maps", title: "Carte des établissements", subtitle: "Vos établissements et l'origine de vos clients sur une carte", roles: allRoles },
  { key: "programs", href: "/programs", title: "Revenus récurrents", subtitle: "Brunchs, soirées et périodes spéciales, avec leur performance", roles: allRoles },
  { key: "library", href: "/library", title: "Documents", subtitle: "Documents et ressources partagées", roles: allRoles },
  { key: "integrations", href: "/integrations", title: "Intégrations", subtitle: "POS et outils connectés", roles: allRoles },
  { key: "billing", href: "/billing", title: "Facturation", subtitle: "Gestion de l'abonnement", roles: ["owner"] },
  { key: "guide", href: "/guide", title: "Guide", subtitle: "Centre d'aide et documentation", roles: allRoles },
  { key: "support", href: "/support", title: "Support", subtitle: "Tickets de support client", roles: allRoles },
  { key: "changelog", href: "/changelog", title: "Nouveautés", subtitle: "Journal des mises à jour", roles: allRoles },
  { key: "settings", href: "/settings", title: "Paramètres", subtitle: "Configuration de l'établissement", roles: managerRoles },
];

export function navItemsForRole(role: Role, sidebarPermissions?: string[] | null): SearchableNavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && (!sidebarPermissions || sidebarPermissions.includes(item.key))
  );
}
