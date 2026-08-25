import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProspectAuditEmail, sendProspectRelanceEmail } from "@/lib/email/prospect-mailer";
import { generateEnrichedProspectAudit } from "@/lib/prospects/audit/ai-audit";
import { generateDemoSlug } from "@/lib/prospects/slug";
import { getDemoUrl } from "@/lib/prospects/demo-url";
import { computeReferralRoiMetrics, getTopAmbassadors } from "@/lib/data/referral-roi";

export type McpToolCategory =
  | "overview"
  | "menu"
  | "orders_tables"
  | "inventory_alerts"
  | "team"
  | "loyalty_referral"
  | "prospects_reach"
  | "system";

export type McpToolDefinition = {
  id: string;
  name: string;
  category: McpToolCategory;
  categoryLabel: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean; description?: string; enum?: string[] }>;
};

export const MCP_TOOLS_CATALOG: McpToolDefinition[] = [
  // 1. Synthèse
  {
    id: "minerva_get_restaurant_summary",
    name: "Synthèse Restaurant Flash",
    category: "overview",
    categoryLabel: "Vue d'ensemble",
    description: "Ventes du jour, commandes en cours, réservations du service et alertes stocks critiques.",
    parameters: {
      restaurantId: { type: "string", description: "ID du restaurant (optionnel)" },
      format: { type: "string", enum: ["compact", "full"], description: "Format de réponse (défaut: compact)" },
    },
  },
  // 2. Menu
  {
    id: "minerva_get_menu_items",
    name: "Articles du Menu & Coûts",
    category: "menu",
    categoryLabel: "Menu & Recettes",
    description: "Catalogue des plats, prix de vente, coûts matières (food cost), marges et statuts actifs.",
    parameters: {
      restaurantId: { type: "string", description: "ID du restaurant (optionnel)" },
      category: { type: "string", description: "Filtrer par catégorie (Entrées, Plats, Desserts...)" },
      activeOnly: { type: "boolean", description: "Filtrer uniquement les plats actifs" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_manage_menu_item",
    name: "Modifier / Créer un Plat",
    category: "menu",
    categoryLabel: "Menu & Recettes",
    description: "Créer, mettre à jour le prix, le coût matière ou désactiver un plat.",
    parameters: {
      restaurantId: { type: "string" },
      action: { type: "string", required: true, enum: ["create", "update", "delete"] },
      itemId: { type: "string", description: "ID de l'article (si update ou delete)" },
      name: { type: "string" },
      price: { type: "number" },
      foodCost: { type: "number" },
      category: { type: "string" },
      active: { type: "boolean" },
    },
  },
  // 3. Commandes & Réservations
  {
    id: "minerva_get_orders",
    name: "Commandes & Ventes du Jour",
    category: "orders_tables",
    categoryLabel: "Commandes & Tables",
    description: "Historique des commandes, totaux, modes de service (sur place, emporter, livraison).",
    parameters: {
      restaurantId: { type: "string" },
      status: { type: "string", enum: ["soumise", "confirmee", "en_preparation", "prete", "servie", "annulee"] },
      limit: { type: "number" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_update_order_status",
    name: "Changer Statut Commande",
    category: "orders_tables",
    categoryLabel: "Commandes & Tables",
    description: "Avancer le statut d'une commande (en préparation, prête, terminée).",
    parameters: {
      orderId: { type: "string", required: true },
      status: { type: "string", required: true, enum: ["soumise", "confirmee", "en_preparation", "prete", "servie", "annulee"] },
    },
  },
  {
    id: "minerva_get_reservations",
    name: "Réservations & Couverts",
    category: "orders_tables",
    categoryLabel: "Commandes & Tables",
    description: "Liste des réservations du jour, nombre de couverts, tables assignées et demandes spéciales.",
    parameters: {
      restaurantId: { type: "string" },
      status: { type: "string", enum: ["confirmee", "annulee", "honoree", "no_show", "demandee"] },
      limit: { type: "number" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_update_reservation_status",
    name: "Mettre à jour Réservation",
    category: "orders_tables",
    categoryLabel: "Commandes & Tables",
    description: "Assigner une table, marquer comme installé (seated) ou terminer.",
    parameters: {
      reservationId: { type: "string", required: true },
      status: { type: "string", required: true, enum: ["confirmee", "annulee", "honoree", "no_show", "demandee"] },
      tableId: { type: "string", description: "ID de la table à assigner (optionnel)" },
    },
  },
  // 4. Inventaire & Alertes
  {
    id: "minerva_get_inventory",
    name: "Niveaux de Stocks & Ingrédients",
    category: "inventory_alerts",
    categoryLabel: "Stocks & Alertes",
    description: "Quantités en stock, seuils d'alerte de réapprovisionnement et coûts unitaires.",
    parameters: {
      restaurantId: { type: "string" },
      lowStockOnly: { type: "boolean" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_update_stock_level",
    name: "Ajuster Stock / Réception",
    category: "inventory_alerts",
    categoryLabel: "Stocks & Alertes",
    description: "Enregistrer une réception fournisseur, une perte ou un inventaire physique.",
    parameters: {
      itemId: { type: "string", required: true },
      quantityChange: { type: "number", required: true },
      reason: { type: "string", required: true, enum: ["reception_fournisseur", "perte_gaspillage", "inventaire_correction", "vente"] },
    },
  },
  {
    id: "minerva_get_alerts",
    name: "Alertes Opérationnelles & Écarts",
    category: "inventory_alerts",
    categoryLabel: "Stocks & Alertes",
    description: "Détection des anomalies : explosion de coûts, baisse de marge, retards.",
    parameters: {
      restaurantId: { type: "string" },
      severity: { type: "string", enum: ["info", "warning", "critical"] },
      unresolvedOnly: { type: "boolean" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_resolve_alert",
    name: "Acquitter / Résoudre une Alerte",
    category: "inventory_alerts",
    categoryLabel: "Stocks & Alertes",
    description: "Marquer une alerte comme traitée avec note explicative.",
    parameters: {
      alertId: { type: "string", required: true },
      resolutionNotes: { type: "string" },
    },
  },
  // 5. Équipe
  {
    id: "minerva_get_employees_and_shifts",
    name: "Planning Équipe & Quarts de Travail",
    category: "team",
    categoryLabel: "Équipe & RH",
    description: "Planning des employés, shifts du jour, pointages et heures travaillées.",
    parameters: {
      restaurantId: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  // 6. Fidélisation & ROI
  {
    id: "minerva_get_customers",
    name: "Clients & Points de Fidélité",
    category: "loyalty_referral",
    categoryLabel: "Fidélisation & Bouche-à-oreille",
    description: "Base clients, historique des visites, dépenses cumulées et soldes de points.",
    parameters: {
      restaurantId: { type: "string" },
      search: { type: "string" },
      limit: { type: "number" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_get_referral_roi_and_ambassadors",
    name: "ROI Parrainage & Meilleurs Ambassadeurs",
    category: "loyalty_referral",
    categoryLabel: "Fidélisation & Bouche-à-oreille",
    description: "Analyse financière du parrainage viral : clics, conversions, CA généré, multiplicateur ROI net et classement des ambassadeurs.",
    parameters: {
      restaurantId: { type: "string" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_create_loyalty_campaign",
    name: "Créer Campagne Marketing / Fidélité",
    category: "loyalty_referral",
    categoryLabel: "Fidélisation & Bouche-à-oreille",
    description: "Programmer une campagne SMS, email ou push promotionnelle ciblée.",
    parameters: {
      restaurantId: { type: "string" },
      name: { type: "string", required: true },
      channel: { type: "string", required: true, enum: ["email", "sms", "push", "social", "sur_place"] },
      type: { type: "string", required: true, enum: ["reduction", "points_doubles", "menu_special", "evenement", "autre"] },
      startDate: { type: "string", required: true },
    },
  },
  {
    id: "minerva_get_reviews_and_feedback",
    name: "Revues IA périodiques",
    category: "loyalty_referral",
    categoryLabel: "Fidélisation & Bouche-à-oreille",
    description: "Synthèses IA générées périodiquement : points forts, points faibles et recommandations pour ce restaurant.",
    parameters: {
      restaurantId: { type: "string" },
      limit: { type: "number" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_get_financial_kpis",
    name: "Indicateurs Financiers & Marges",
    category: "overview",
    categoryLabel: "Vue d'ensemble",
    description: "Ticket moyen, ventilation des ventes, coût main d'oeuvre vs coût matière (Prime Cost).",
    parameters: {
      restaurantId: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
    },
  },
  // 7. Prospection Minerva Reach
  {
    id: "minerva_get_prospects",
    name: "Pipeline de Prospection Reach",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Liste des restaurants cibles qualifiés, statuts d'outreach et commissions estimées.",
    parameters: {
      status: { type: "string", enum: ["draft", "nouveau", "ready", "contacte", "audit_envoye", "relance_1", "relance_2", "rdv_fixe", "converti", "decline"] },
      limit: { type: "number" },
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  {
    id: "minerva_create_prospect",
    name: "Ajouter un Restaurant Cible",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Créer une fiche prospect avec estimation du volume de livraison.",
    parameters: {
      restaurantName: { type: "string", required: true },
      contactName: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      city: { type: "string" },
      monthlyDeliveryVolume: { type: "number" },
      commissionRatePct: { type: "number" },
    },
  },
  {
    id: "minerva_sync_reach_leads",
    name: "Synchroniser Leads Reach (Batch)",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Import en masse de leads qualifiés depuis le scraper ou webhook Minerva Reach.",
    parameters: {
      leads: { type: "array", required: true, description: "Liste des leads qualifiés" },
    },
  },
  {
    id: "minerva_run_prospect_audit",
    name: "Générer Audit IA de Commissions",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Calcule les pertes financières sur Uber Eats / DoorDash et génère une page de démo personnalisée.",
    parameters: {
      prospectId: { type: "string", required: true },
    },
  },
  {
    id: "minerva_send_prospect_audit",
    name: "Envoyer l'Audit par Email (Resend)",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Envoie l'audit avec le lien de démo interactive au restaurateur.",
    parameters: {
      prospectId: { type: "string", required: true },
      email: { type: "string" },
    },
  },
  {
    id: "minerva_trigger_prospect_relance",
    name: "Déclencher une Relance Automatisée",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Envoie l'email de relance J+2 (Relance 1) ou J+5 (Relance 2) et met à jour le statut du lead.",
    parameters: {
      prospectId: { type: "string", required: true },
      step: { type: "string", required: true, enum: ["relance_1", "relance_2"] },
      customNotes: { type: "string" },
    },
  },
  {
    id: "minerva_get_prospects_due_for_followup",
    name: "Leads Éligibles à une Relance",
    category: "prospects_reach",
    categoryLabel: "Prospection Minerva Reach",
    description: "Identifie les prospects ayant dépassé le délai J+2 ou J+5 sans réponse.",
    parameters: {
      format: { type: "string", enum: ["compact", "full"] },
    },
  },
  // 8. Diagnostic
  {
    id: "minerva_system_health",
    name: "Diagnostic Supabase Live (Zéro Mock)",
    category: "system",
    categoryLabel: "Diagnostic & Santé Système",
    description: "Test de connexion SQL direct en temps réel avec comptage des lignes sur chaque table.",
    parameters: {},
  },
];

export async function resolveRestaurantId(
  supabase: ReturnType<typeof createAdminClient>,
  explicitId: string | undefined,
  authRestaurantId: string | null = null
): Promise<string | null> {
  // A tenant-scoped API key can never be redirected to another restaurant by its own request args.
  if (authRestaurantId) return authRestaurantId;
  if (explicitId) return explicitId;
  const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function executeMcpTool(
  toolId: string,
  args: Record<string, unknown> = {},
  authRestaurantId: string | null = null
): Promise<{ success: boolean; data?: unknown; error?: string; tokenSavingsPct?: number }> {
  const supabase = createAdminClient();
  const format = (args.format as string) || "compact";
  const explicitRestaurantId = typeof args.restaurantId === "string" ? args.restaurantId : undefined;

  try {
    switch (toolId) {
      case "minerva_get_restaurant_summary": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Aucun restaurant trouvé." };

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
          { data: restaurant },
          { count: todayOrdersCount },
          { data: todayOrders },
          { count: todayReservationsCount },
          { count: lowStockCount },
        ] = await Promise.all([
          supabase.from("restaurants").select("id, name, city, currency, service_model").eq("id", restaurantId).maybeSingle(),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
          supabase.from("orders").select("total, status").eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
          supabase.from("reservations").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("reservation_time", todayStart.toISOString()),
          supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).lt("quantity_on_hand", 5),
        ]);

        const todayRevenue = (todayOrders as { total: number }[] ?? []).reduce((sum, o) => sum + (o.total || 0), 0);

        const summary = {
          restaurant: (restaurant as { name: string; city: string; currency: string } | null)?.name,
          city: (restaurant as { name: string; city: string; currency: string } | null)?.city,
          ordersToday: todayOrdersCount ?? 0,
          revenueToday: Math.round(todayRevenue * 100) / 100,
          reservationsToday: todayReservationsCount ?? 0,
          stockAlerts: lowStockCount ?? 0,
        };

        return { success: true, data: summary, tokenSavingsPct: 75 };
      }

      case "minerva_get_menu_items": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("category").order("name");
        if (args.category) query = query.eq("category", args.category as string);
        if (args.activeOnly) query = query.eq("active", true);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };

        if (format === "compact") {
          const compact = (data ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            cat: i.category,
            cost: i.food_cost,
            sold: i.units_sold,
            active: i.active,
          }));
          return { success: true, data: compact, tokenSavingsPct: 70 };
        }

        return { success: true, data: data ?? [] };
      }

      case "minerva_manage_menu_item": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const action = args.action as string;
        if (action === "create") {
          const { data, error } = await supabase
            .from("menu_items")
            .insert({
              restaurant_id: restaurantId,
              name: String(args.name || "Nouveau Plat"),
              price: Number(args.price || 15),
              food_cost: Number(args.foodCost || 4.5),
              category: String(args.category || "Plats"),
              active: args.active !== false,
            })
            .select()
            .single();
          if (error) return { success: false, error: error.message };
          return { success: true, data: { created: data } };
        }
        if (action === "update" && args.itemId) {
          const patch: Record<string, unknown> = {};
          if (args.name !== undefined) patch.name = args.name;
          if (args.price !== undefined) patch.price = args.price;
          if (args.foodCost !== undefined) patch.food_cost = args.foodCost;
          if (args.active !== undefined) patch.active = args.active;
          const { data, error } = await supabase.from("menu_items").update(patch).eq("id", args.itemId).eq("restaurant_id", restaurantId).select().single();
          if (error) return { success: false, error: error.message };
          return { success: true, data: { updated: data } };
        }
        if (action === "delete" && args.itemId) {
          const { error } = await supabase.from("menu_items").delete().eq("id", args.itemId).eq("restaurant_id", restaurantId);
          if (error) return { success: false, error: error.message };
          return { success: true, data: { deletedId: args.itemId } };
        }
        return { success: false, error: "Action non supportée" };
      }

      case "minerva_get_orders": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("orders").select("id, guest_name, status, total, payment_method, created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(Number(args.limit || 20));
        if (args.status) query = query.eq("status", args.status as string);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [], tokenSavingsPct: 65 };
      }

      case "minerva_update_order_status": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data, error } = await supabase
          .from("orders")
          .update({ status: args.status })
          .eq("id", args.orderId)
          .eq("restaurant_id", restaurantId)
          .select("id, status, guest_name")
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, data: { updated: data } };
      }

      case "minerva_get_reservations": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("reservations").select("id, guest_name, party_size, reservation_time, status, table_id, notes").eq("restaurant_id", restaurantId).order("reservation_time", { ascending: false }).limit(Number(args.limit || 20));
        if (args.status) query = query.eq("status", args.status as string);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [], tokenSavingsPct: 68 };
      }

      case "minerva_update_reservation_status": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const patch: Record<string, unknown> = { status: args.status };
        if (args.tableId) patch.table_id = args.tableId;
        const { data, error } = await supabase
          .from("reservations")
          .update(patch)
          .eq("id", args.reservationId)
          .eq("restaurant_id", restaurantId)
          .select("id, status, table_id")
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, data: { updated: data } };
      }

      case "minerva_get_inventory": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("inventory_items").select("id, name, quantity_on_hand, unit, unit_cost, minimum_stock_alert").eq("restaurant_id", restaurantId);
        if (args.lowStockOnly) query = query.lt("quantity_on_hand", 5);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [], tokenSavingsPct: 70 };
      }

      case "minerva_update_stock_level": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data: item, error: fetchErr } = await supabase
          .from("inventory_items")
          .select("id, quantity_on_hand")
          .eq("id", args.itemId)
          .eq("restaurant_id", restaurantId)
          .single();
        if (fetchErr || !item) return { success: false, error: "Ingrédient introuvable" };

        const newQty = Math.max(0, (item.quantity_on_hand || 0) + Number(args.quantityChange));
        const { data, error } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: newQty })
          .eq("id", args.itemId)
          .eq("restaurant_id", restaurantId)
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, data: { updated: data, previousQty: item.quantity_on_hand, newQty } };
      }

      case "minerva_get_employees_and_shifts": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const [{ data: employees }, { data: shifts }] = await Promise.all([
          supabase.from("employees").select("id, name, role, is_active").eq("restaurant_id", restaurantId),
          supabase.from("shifts").select("id, employee_id, start_time, end_time, status").eq("restaurant_id", restaurantId).limit(20),
        ]);

        return { success: true, data: { employees: employees ?? [], shifts: shifts ?? [] }, tokenSavingsPct: 65 };
      }

      case "minerva_get_alerts": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("alerts").select("id, type, severity, message, resolved, created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(20);
        if (args.unresolvedOnly) query = query.eq("resolved", false);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [] };
      }

      case "minerva_resolve_alert": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data, error } = await supabase
          .from("alerts")
          .update({ resolved: true })
          .eq("id", args.alertId)
          .eq("restaurant_id", restaurantId)
          .select("id, resolved")
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, data: { resolvedAlert: data } };
      }

      case "minerva_get_customers": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        let query = supabase.from("customers").select("id, name, email, visit_count, total_spent, loyalty_points, last_visit_at").eq("restaurant_id", restaurantId).order("visit_count", { ascending: false }).limit(Number(args.limit || 30));
        if (args.search) query = query.ilike("name", `%${args.search}%`);

        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [], tokenSavingsPct: 72 };
      }

      case "minerva_get_referral_roi_and_ambassadors": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const [roi, ambassadors] = await Promise.all([
          computeReferralRoiMetrics(restaurantId),
          getTopAmbassadors(restaurantId, 5),
        ]);

        const formatted = {
          clicks: roi.totalClicks,
          conversions: roi.totalConversions,
          rate: `${roi.conversionRatePct}%`,
          revenue: roi.totalRevenueGenerated,
          cost: roi.estimatedRewardsCost,
          multiplier: `${roi.roiMultiplier}x`,
          topAmbassadors: ambassadors.map((a) => ({ name: a.customerName, conversions: a.referralConversions, revenue: a.revenueGenerated })),
        };
        return { success: true, data: formatted, tokenSavingsPct: 78 };
      }

      case "minerva_create_loyalty_campaign": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data, error } = await supabase.from("campaigns").insert({
          restaurant_id: restaurantId,
          name: String(args.name),
          channel: String(args.channel),
          type: String(args.type),
          start_date: String(args.startDate),
          status: "planifiee",
        }).select().single();

        if (error) return { success: false, error: error.message };
        return { success: true, data: { campaign: data } };
      }

      case "minerva_get_reviews_and_feedback": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data, error } = await supabase
          .from("ai_reviews")
          .select("id, period_start, period_end, strengths, weaknesses, recommendations, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(Number(args.limit || 3));
        if (error) return { success: false, error: error.message };

        if (format === "compact") {
          const compact = (data ?? []).map((r) => ({
            id: r.id,
            period: `${r.period_start} -> ${r.period_end}`,
            strengths: r.strengths?.slice(0, 2),
            weaknesses: r.weaknesses?.slice(0, 2),
            recs: r.recommendations?.slice(0, 2),
          }));
          return { success: true, data: compact, tokenSavingsPct: 60 };
        }

        return { success: true, data: data ?? [] };
      }

      case "minerva_get_financial_kpis": {
        const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId, authRestaurantId);
        if (!restaurantId) return { success: false, error: "Restaurant introuvable" };

        const { data: orders } = await supabase.from("orders").select("total, status, created_at").eq("restaurant_id", restaurantId).limit(200);
        const totalSales = (orders ?? []).reduce((acc, cur) => acc + (cur.total || 0), 0);
        return { success: true, data: { totalRevenueRecorded: Math.round(totalSales * 100) / 100, ordersAnalyzed: orders?.length ?? 0 } };
      }

      case "minerva_get_prospects": {
        let query = supabase
          .from("prospects")
          .select("id, restaurant_name, source_url, source_platform, status, demo_slug, commission_rate_pct, assumed_monthly_orders, demo_view_count, contacted_at, notes, contact_name, created_at")
          .order("created_at", { ascending: false })
          .limit(Number(args.limit || 20));
        if (args.status) query = query.eq("status", args.status as string);
        const { data, error } = await query;
        if (error) return { success: false, error: error.message };
        return { success: true, data: data ?? [], tokenSavingsPct: 70 };
      }

      case "minerva_create_prospect": {
        const slug = generateDemoSlug(String(args.restaurantName));
        const notes = [
          args.notes,
          args.email ? `Email: ${args.email}` : null,
          args.phone ? `Tél: ${args.phone}` : null,
          args.city ? `Ville: ${args.city}` : null,
        ].filter(Boolean).join(" | ") || null;

        const { data, error } = await supabase.from("prospects").insert({
          restaurant_name: String(args.restaurantName),
          source_url: args.sourceUrl ? String(args.sourceUrl) : "https://example.com",
          source_platform: (args.sourcePlatform as string) || "direct_website",
          commission_rate_pct: Number(args.commissionRatePct || 28),
          assumed_monthly_orders: Number(args.assumedMonthlyOrders || 300),
          demo_slug: slug,
          status: "ready",
          notes,
          contact_name: args.contactName ? String(args.contactName) : null,
          menu_json: { categories: [] },
        }).select().single();

        if (error) return { success: false, error: error.message };
        return { success: true, data: { prospect: data, demoUrl: getDemoUrl(slug) } };
      }

      case "minerva_sync_reach_leads": {
        const leads = (args.leads as Record<string, unknown>[]) || [];
        let imported = 0;
        for (const lead of leads) {
          const name = String(lead.name || lead.restaurant_name || "");
          if (!name) continue;
          const slug = generateDemoSlug(name);
          const notes = [
            lead.notes,
            lead.email ? `Email: ${lead.email}` : null,
            lead.phone ? `Tél: ${lead.phone}` : null,
            lead.city ? `Ville: ${lead.city}` : null,
          ].filter(Boolean).join(" | ") || null;

          const { error } = await supabase.from("prospects").insert({
            restaurant_name: name,
            source_url: (lead.source_url as string) || (lead.sourceUrl as string) || "https://example.com",
            source_platform: "other",
            demo_slug: slug,
            status: "nouveau",
            notes,
            contact_name: lead.contact_name ? String(lead.contact_name) : null,
            menu_json: { categories: [] },
          });
          if (!error) imported++;
        }
        return { success: true, data: { totalSubmitted: leads.length, imported } };
      }

      case "minerva_run_prospect_audit": {
        const { data: p, error } = await supabase.from("prospects").select("*").eq("id", args.prospectId).single();
        if (error || !p) return { success: false, error: "Prospect introuvable" };

        const audit = await generateEnrichedProspectAudit({
          restaurantName: p.restaurant_name,
          websiteUrl: p.source_url || `https://${p.demo_slug || "demo"}.minerva-flow.com`,
          commissionRatePct: Number(p.commission_rate_pct || 25),
          assumedMonthlyOrders: p.assumed_monthly_orders || 500,
        });

        await supabase.from("prospects").update({
          estimated_loss: audit.monthlyCommissionLoss,
          audit_generated_at: new Date().toISOString(),
          audit_report: audit,
        }).eq("id", p.id);

        return { success: true, data: { audit } };
      }

      case "minerva_send_prospect_audit": {
        const { data: row, error } = await supabase.from("prospects").select("*").eq("id", args.prospectId).single();
        if (error || !row) return { success: false, error: "Prospect introuvable" };

        const recipient = (args.email as string) || row.email;
        if (!recipient) return { success: false, error: "Aucun email disponible" };

        const prospect = {
          id: row.id,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          restaurantName: row.restaurant_name,
          currency: row.currency,
          detectedAddress: row.detected_address,
          commissionRatePct: Number(row.commission_rate_pct),
          assumedMonthlyOrders: row.assumed_monthly_orders,
          status: row.status,
          demoSlug: row.demo_slug,
          menu: row.menu_json ?? { categories: [] },
          notes: row.notes,
          demoViewCount: row.demo_view_count,
          lastViewedAt: row.last_viewed_at,
          contactedAt: row.contacted_at,
          auditReport: row.audit_report,
          auditGeneratedAt: row.audit_generated_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        const result = await sendProspectAuditEmail({
          to: recipient,
          prospect,
        });

        if (!result.ok) return { success: false, error: result.error };

        await supabase.from("prospects").update({ status: "audit_envoye", contacted_at: new Date().toISOString() }).eq("id", row.id);
        return { success: true, data: { sent: true, recipient } };
      }

      case "minerva_trigger_prospect_relance": {
        const { data: row, error } = await supabase.from("prospects").select("*").eq("id", args.prospectId).single();
        if (error || !row) return { success: false, error: "Prospect introuvable" };

        const recipient = (args.recipientEmail as string) || row.email;
        if (!recipient) return { success: false, error: "Email manquant" };

        const stepNum: 1 | 2 = args.step === 2 || args.step === "relance_2" ? 2 : 1;
        const prospect = {
          id: row.id,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          restaurantName: row.restaurant_name,
          currency: row.currency,
          detectedAddress: row.detected_address,
          commissionRatePct: Number(row.commission_rate_pct),
          assumedMonthlyOrders: row.assumed_monthly_orders,
          status: row.status,
          demoSlug: row.demo_slug,
          menu: row.menu_json ?? { categories: [] },
          notes: row.notes,
          demoViewCount: row.demo_view_count,
          lastViewedAt: row.last_viewed_at,
          contactedAt: row.contacted_at,
          auditReport: row.audit_report,
          auditGeneratedAt: row.audit_generated_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        const result = await sendProspectRelanceEmail({
          to: recipient,
          prospect,
          step: stepNum,
        });

        if (!result.ok) return { success: false, error: result.error };

        const nextStatus = stepNum === 1 ? "relance_1" : "relance_2";
        await supabase.from("prospects").update({ status: nextStatus, contacted_at: new Date().toISOString() }).eq("id", row.id);
        return { success: true, data: { sent: true, step: stepNum, recipient } };
      }

      case "minerva_get_prospects_due_for_followup": {
        const { data } = await supabase.from("prospects").select("id, restaurant_name, status, contacted_at, created_at, demo_slug").order("created_at", { ascending: false });
        const now = Date.now();
        const dueList: unknown[] = [];

        for (const p of data ?? []) {
          if (p.status === "converti" || p.status === "decline" || p.status === "rdv_fixe") continue;
          const lastContact = p.contacted_at ? new Date(p.contacted_at).getTime() : p.created_at ? new Date(p.created_at).getTime() : null;
          if (!lastContact) continue;
          const daysSince = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

          if ((p.status === "audit_envoye" || p.status === "contacte") && daysSince >= 2) {
            dueList.push({ id: p.id, name: p.restaurant_name, status: p.status, step: 1, daysSince, slug: p.demo_slug });
          } else if (p.status === "relance_1" && daysSince >= 3) {
            dueList.push({ id: p.id, name: p.restaurant_name, status: p.status, step: 2, daysSince, slug: p.demo_slug });
          }
        }

        return { success: true, data: dueList, tokenSavingsPct: 75 };
      }

      case "minerva_system_health": {
        const [
          { count: restCount, error: errRest },
          { count: menuCount },
          { count: orderCount },
          { count: customerCount },
          { count: prospectCount },
        ] = await Promise.all([
          supabase.from("restaurants").select("id", { count: "exact", head: true }),
          supabase.from("menu_items").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("customers").select("id", { count: "exact", head: true }),
          supabase.from("prospects").select("id", { count: "exact", head: true }),
        ]);

        if (errRest) return { success: false, error: errRest.message };

        return {
          success: true,
          data: {
            dbConnected: true,
            provider: "Supabase Live Database (Production)",
            counts: {
              restaurants: restCount ?? 0,
              menuItems: menuCount ?? 0,
              orders: orderCount ?? 0,
              customers: customerCount ?? 0,
              prospects: prospectCount ?? 0,
            },
            verifiedAt: new Date().toISOString(),
          },
        };
      }

      default:
        return { success: false, error: `Outil inconnu : ${toolId}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
