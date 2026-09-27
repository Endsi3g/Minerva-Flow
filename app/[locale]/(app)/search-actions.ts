"use server";

import { getCampaigns } from "@/lib/data/campaigns";
import { getEmployees } from "@/lib/data/employees";
import { getPrograms } from "@/lib/data/programs";
import { getMySupportRequests } from "@/lib/data/support";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOrdersForDay } from "@/lib/data/orders";
import { NAV_ITEMS } from "@/lib/nav-items";

export type SearchResult = {
  id: string;
  type:
    | "action"
    | "setting"
    | "campaign"
    | "employee"
    | "program"
    | "support"
    | "navigation"
    | "customer"
    | "menu_item"
    | "inventory_item"
    | "order";
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
};

type QuickActionDef = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
};

const QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: "action-service-day",
    title: "Enregistrer un service (CA / Chiffre d'affaires)",
    subtitle: "Saisir les ventes, le rush et les faits marquants du jour",
    href: "/days",
    keywords: ["service", "ca", "chiffre", "affaires", "enregistrer", "ventes", "jour", "journee", "argent", "revenu", "bilan"],
  },
  {
    id: "action-new-shift",
    title: "Planifier un quart d'horaire",
    subtitle: "Assigner un horaire ou quart de travail à un employé",
    href: "/horaire",
    keywords: ["horaire", "quart", "shift", "planning", "planifier", "employe", "staff", "calendrier", "equipe"],
  },
  {
    id: "action-kds",
    title: "Ouvrir l'Écran Cuisine (KDS)",
    subtitle: "Tableau de bord live des tickets de cuisine et temps de prépa",
    href: "/commandes",
    keywords: ["kds", "cuisine", "ecran", "tickets", "preparation", "commandes", "chef", "livraison"],
  },
  {
    id: "action-menu-item",
    title: "Ajouter un plat / article au menu",
    subtitle: "Configurer prix, coût de revient (food cost) et recette",
    href: "/menu",
    keywords: ["menu", "plat", "article", "ajouter", "prix", "carte", "nourriture", "boisson", "recette", "foodcost"],
  },
  {
    id: "action-inventory-item",
    title: "Ajouter un article d'inventaire",
    subtitle: "Enregistrer quantité en main, seuil et coût d'achat",
    href: "/inventaire",
    keywords: ["inventaire", "stock", "article", "quantite", "seuil", "matiere", "ingredient", "fournisseur"],
  },
  {
    id: "action-supplier-order",
    title: "Passer commande fournisseur",
    subtitle: "Créer un bon de réapprovisionnement pour vos stocks bas",
    href: "/fournisseurs",
    keywords: ["fournisseur", "commande", "achat", "restock", "reapprovisionnement", "po", "livraison"],
  },
  {
    id: "action-loyalty-reward",
    title: "Créer une récompense fidélité",
    subtitle: "Définir les points requis et les cadeaux clients",
    href: "/fidelisation/recompenses",
    keywords: ["fidelisation", "recompense", "points", "fidelite", "rabais", "cadeau", "offre", "vip"],
  },
  {
    id: "action-campaign",
    title: "Lancer une campagne marketing",
    subtitle: "Campagnes SMS, courriels de relance ou promotions ciblées",
    href: "/campaigns/new",
    keywords: ["campagne", "marketing", "sms", "email", "courriel", "promo", "pub", "relance"],
  },
  {
    id: "action-qr-poster",
    title: "Générer les QR Codes & Affiches de table",
    subtitle: "QR Code menu sans commission et enrôlement fidélité",
    href: "/etablissement",
    keywords: ["qr", "code", "widget", "table", "imprimer", "poster", "site", "vitrine", "affiche"],
  },
  {
    id: "action-ai-assistant",
    title: "Poser une question à Flow AI",
    subtitle: "Assistant IA intelligent pour l'analyse et la rentabilité",
    href: "/assistant",
    keywords: ["ai", "assistant", "intelligence", "question", "minerva", "analyse", "prompt", "chat"],
  },
];

const SETTINGS_DEEP_LINKS: SearchResult[] = [
  {
    id: "setting-integrations",
    type: "setting",
    title: "Intégrations & Caisse POS (Square, Lightspeed, Stripe)",
    subtitle: "Connexions caisses enregistreuses, paiements et plateformes",
    href: "/settings?tab=integrations",
    badge: "Paramètres",
  },
  {
    id: "setting-team",
    type: "setting",
    title: "Équipe & Gestion des Rôles",
    subtitle: "Permissions d'accès (Owner, Manager, Staff, Consultant)",
    href: "/settings?tab=equipe",
    badge: "Paramètres",
  },
  {
    id: "setting-alerts",
    type: "setting",
    title: "Alertes & Règles Opérationnelles",
    subtitle: "Règles automatiques de détection des marges et stocks",
    href: "/settings?tab=alertes",
    badge: "Paramètres",
  },
  {
    id: "setting-general",
    type: "setting",
    title: "Établissement & Coordonnées",
    subtitle: "Nom, adresse, numéro de téléphone et logo de l'établissement",
    href: "/settings?tab=general",
    badge: "Paramètres",
  },
  {
    id: "setting-billing",
    type: "setting",
    title: "Facturation & Forfait Flow",
    subtitle: "Gestion de l'abonnement SaaS et factures",
    href: "/billing",
    badge: "Abonnement",
  },
  {
    id: "setting-guide",
    type: "setting",
    title: "Guide & Raccourcis Clavier",
    subtitle: "Documentation complète d'utilisation de Minerva Flow",
    href: "/guide",
    badge: "Aide",
  },
  {
    id: "setting-changelog",
    type: "setting",
    title: "Nouveautés & Mises à Jour (Changelog)",
    subtitle: "Historique des fonctionnalités et améliorations déployées",
    href: "/changelog",
    badge: "Nouveautés",
  },
];

export async function searchEverythingAction(
  restaurantId: string | null,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim() === "") return [];
  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // 1. Search Quick Actions & Commands
  for (const action of QUICK_ACTIONS) {
    if (
      action.title.toLowerCase().includes(normalizedQuery) ||
      action.subtitle.toLowerCase().includes(normalizedQuery) ||
      action.keywords.some((k) => k.includes(normalizedQuery) || normalizedQuery.includes(k))
    ) {
      results.push({
        id: action.id,
        type: "action",
        title: action.title,
        subtitle: action.subtitle,
        href: action.href,
        badge: "Action",
      });
    }
  }

  // 2. Search Settings Deep Links
  for (const setting of SETTINGS_DEEP_LINKS) {
    if (
      setting.title.toLowerCase().includes(normalizedQuery) ||
      (setting.subtitle && setting.subtitle.toLowerCase().includes(normalizedQuery))
    ) {
      results.push(setting);
    }
  }

  // 3. Search Navigation
  for (const item of NAV_ITEMS) {
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

  // 4. Search Database Entities (parallelized with resilience)
  if (restaurantId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [campaigns, employees, programs, supportRequests, customers, menuItems, inventoryItems, orders] =
      await Promise.all([
        getCampaigns(restaurantId).catch(() => []),
        getEmployees(restaurantId).catch(() => []),
        getPrograms(restaurantId).catch(() => []),
        getMySupportRequests().catch(() => []),
        getCustomers(restaurantId).catch(() => []),
        getMenuItems(restaurantId).catch(() => []),
        getInventoryItems(restaurantId).catch(() => []),
        getOrdersForDay(restaurantId, todayStart.toISOString(), todayEnd.toISOString()).catch(() => []),
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

    // Orders (today)
    for (const o of orders) {
      if (o.guestName.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: o.id,
          type: "order",
          title: o.guestName,
          subtitle: `Commande • ${o.status} (${o.total.toFixed(2)}$)`,
          href: `/commandes`,
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
