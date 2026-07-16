"use server";

import { getCampaigns } from "@/lib/data/campaigns";
import { getEmployees } from "@/lib/data/employees";
import { getPrograms } from "@/lib/data/programs";
import { getMySupportRequests } from "@/lib/data/support";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { getInventoryItems } from "@/lib/data/inventory";

export type SearchResult = {
  id: string;
  type:
    | "campaign"
    | "employee"
    | "program"
    | "support"
    | "navigation"
    | "customer"
    | "menu_item"
    | "inventory_item";
  title: string;
  subtitle?: string;
  href: string;
};

export async function searchEverythingAction(
  restaurantId: string | null,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim() === "") return [];
  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // 1. Search Navigation
  const navigationItems = [
    { title: "Overview", subtitle: "Tableau de bord principal", href: "/overview" },
    { title: "Flow AI", subtitle: "Assistant IA conversationnel", href: "/assistant" },
    { title: "Programmes", subtitle: "Gestion des programmes de fidélité et d'opérations", href: "/programs" },
    { title: "Journées", subtitle: "Suivi des performances journalières", href: "/days" },
    { title: "Collaborateurs", subtitle: "Gestion de l'équipe et des permissions", href: "/collaborateurs" },
    { title: "Employés", subtitle: "Liste des employés et revues de performance", href: "/employees" },
    { title: "Campagnes", subtitle: "Suivi des campagnes marketing", href: "/campaigns" },
    { title: "Cartes", subtitle: "Visualisation des cartes et zones de livraison", href: "/maps" },
    { title: "Réservations", subtitle: "Réservations et assignation des tables", href: "/reservations" },
    { title: "Horaire", subtitle: "Planification des quarts de l'équipe", href: "/horaire" },
    { title: "Fournisseurs", subtitle: "Commandes et répertoire de fournisseurs", href: "/fournisseurs" },
    { title: "Fidélisation", subtitle: "Fiches clients, visites et points de fidélité", href: "/fidelisation" },
    { title: "Menu", subtitle: "Ingénierie de menu et rentabilité par plat", href: "/menu" },
    { title: "Inventaire", subtitle: "Quantités en main et suivi du gaspillage", href: "/inventaire" },
    { title: "Finance", subtitle: "Analyse des transactions et revenus", href: "/finance" },
    { title: "Dépenses", subtitle: "Toutes vos sorties d'argent, en détail", href: "/depenses" },
    { title: "Données", subtitle: "Statistiques clés de l'application", href: "/data" },
    { title: "Paramètres", subtitle: "Configuration de la succursale", href: "/settings" },
    { title: "Facturation", subtitle: "Gestion de l'abonnement et de la facturation", href: "/billing" },
    { title: "Guide", subtitle: "Centre d'aide et documentation", href: "/guide" },
    { title: "Support", subtitle: "Tickets de support client", href: "/support" },
    { title: "Nouveautés", subtitle: "Changelog et nouveautés", href: "/changelog" },
  ];

  for (const item of navigationItems) {
    if (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.subtitle.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({
        id: item.href,
        type: "navigation",
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
      });
    }
  }

  // 2. Search Database Entities (only if restaurantId is provided)
  if (restaurantId) {
    const [campaigns, employees, programs, supportRequests, customers, menuItems, inventoryItems] = await Promise.all([
      getCampaigns(restaurantId).catch(() => []),
      getEmployees(restaurantId).catch(() => []),
      getPrograms(restaurantId).catch(() => []),
      getMySupportRequests().catch(() => []),
      getCustomers(restaurantId).catch(() => []),
      getMenuItems(restaurantId).catch(() => []),
      getInventoryItems(restaurantId).catch(() => []),
    ]);

    // Campaigns
    for (const c of campaigns) {
      if (
        c.name.toLowerCase().includes(normalizedQuery) ||
        (c.description && c.description.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: c.id,
          type: "campaign",
          title: c.name,
          subtitle: `Campagne • ${c.channel} (${c.status})`,
          href: `/campaigns?id=${c.id}`,
        });
      }
    }

    // Employees
    for (const e of employees) {
      if (
        e.fullName.toLowerCase().includes(normalizedQuery) ||
        e.roleTitle.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: e.id,
          type: "employee",
          title: e.fullName,
          subtitle: `Employé • ${e.roleTitle} (${e.active ? "Actif" : "Inactif"})`,
          href: `/employees?id=${e.id}`,
        });
      }
    }

    // Programs
    for (const p of programs) {
      if (
        p.name.toLowerCase().includes(normalizedQuery) ||
        (p.description && p.description.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: p.id,
          type: "program",
          title: p.name,
          subtitle: `Programme • ${p.status}`,
          href: `/programs`,
        });
      }
    }

    // Customers
    for (const c of customers) {
      if (
        c.name.toLowerCase().includes(normalizedQuery) ||
        (c.email && c.email.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: c.id,
          type: "customer",
          title: c.name,
          subtitle: `Client • ${c.loyaltyPoints} pts (${c.visitCount} visite${c.visitCount > 1 ? "s" : ""})`,
          href: `/fidelisation?id=${c.id}`,
        });
      }
    }

    // Menu items
    for (const m of menuItems) {
      if (
        m.name.toLowerCase().includes(normalizedQuery) ||
        (m.category && m.category.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: m.id,
          type: "menu_item",
          title: m.name,
          subtitle: `Menu${m.category ? ` • ${m.category}` : ""}`,
          href: `/menu`,
        });
      }
    }

    // Inventory items
    for (const i of inventoryItems) {
      if (
        i.name.toLowerCase().includes(normalizedQuery) ||
        (i.category && i.category.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: i.id,
          type: "inventory_item",
          title: i.name,
          subtitle: `Inventaire • ${i.quantityOnHand} ${i.unit}`,
          href: `/inventaire`,
        });
      }
    }

    // Support Requests
    for (const s of supportRequests) {
      if (
        s.subject.toLowerCase().includes(normalizedQuery) ||
        s.message.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: s.id,
          type: "support",
          title: s.subject,
          subtitle: `Support • Ticket #${s.id.slice(0, 8)} (${s.status})`,
          href: `/support`,
        });
      }
    }
  }

  return results;
}
