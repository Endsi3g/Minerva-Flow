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
};

export async function searchEverythingAction(
  restaurantId: string | null,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim() === "") return [];
  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // 1. Search Navigation — NAV_ITEMS is the same canonical list SearchDialog
  // shows as suggestions, so results here never drift from what the app
  // actually has (this used to be its own separately-hardcoded, stale copy).
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

  // 2. Search Database Entities (only if restaurantId is provided)
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
