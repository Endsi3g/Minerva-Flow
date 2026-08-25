import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProspectAuditEmail, sendProspectRelanceEmail } from "@/lib/email/prospect-mailer";
import { generateEnrichedProspectAudit } from "@/lib/prospects/audit/ai-audit";
import { generateDemoSlug } from "@/lib/prospects/slug";
import { getDemoUrl } from "@/lib/prospects/demo-url";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// API Key & Bearer Token verification
const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  let token = bearerToken;

  if (!token) {
    const xApiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
    if (xApiKey) {
      token = xApiKey;
    } else {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
      } else {
        try {
          const url = new URL(req.url);
          token = url.searchParams.get("api_key") || url.searchParams.get("apiKey") || url.searchParams.get("token") || undefined;
        } catch {
          // invalid URL
        }
      }
    }
  }

  if (!token) return undefined;

  const serverToken = process.env.MCP_SERVER_TOKEN;
  const hermesToken = process.env.MCP_HERMES_TOKEN;

  // System-level tokens (.env) are admin credentials, not tied to one tenant: they may
  // operate on whatever restaurantId the caller supplies (or the single-restaurant fallback).
  if (serverToken && safeEqual(token, serverToken)) {
    return { token, scopes: ["all:minerva-flow"], clientId: "claude-or-api", extra: { restaurantId: null } };
  }
  if (hermesToken && safeEqual(token, hermesToken)) {
    return { token, scopes: ["all:minerva-flow"], clientId: "hermes-agent", extra: { restaurantId: null } };
  }

  // Check dynamic user-created API keys. These are hard-scoped to the restaurant they were
  // issued for (api_keys.restaurant_id) — that scoping travels in `extra.restaurantId` and
  // MUST override any restaurantId the caller passes in tool arguments (see resolveRestaurantId).
  try {
    const { verifyDynamicApiKey } = await import("@/lib/data/api-keys");
    const dynamicAuth = await verifyDynamicApiKey(token);
    if (dynamicAuth) {
      return {
        token: dynamicAuth.token,
        scopes: dynamicAuth.scopes,
        clientId: dynamicAuth.clientId,
        extra: { restaurantId: dynamicAuth.restaurantId },
      };
    }
  } catch {
    // ignore
  }

  return undefined;
};

/** The restaurantId a tenant-scoped API key is locked to, or null for an unscoped admin token. */
function authRestaurantIdFrom(ctx: ServerContext): string | null {
  const extra = ctx.http?.authInfo?.extra;
  const restaurantId = extra?.restaurantId;
  return typeof restaurantId === "string" ? restaurantId : null;
}

async function resolveRestaurantId(
  supabase: ReturnType<typeof createAdminClient>,
  explicitId: string | undefined,
  authRestaurantId: string | null
): Promise<string | null> {
  // A tenant-scoped key can never be redirected to another restaurant by its own request args.
  if (authRestaurantId) return authRestaurantId;
  if (explicitId) return explicitId;
  const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

const handler = createMcpHandler(
  (server) => {
    // ====================================================
    // 1. Synthèse globale Restaurant (High-Density)
    // ====================================================
    server.registerTool(
      "minerva_get_restaurant_summary",
      {
        title: "Synthèse Restaurant",
        description: "Vue d'ensemble rapide : statut, ventes du jour, commandes, réservations, alertes stocks et métriques.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional().describe("ID du restaurant"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) {
          return { content: [{ type: "text" as const, text: "Aucun restaurant trouvé." }], isError: true };
        }

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

        return { content: [{ type: "text" as const, text: JSON.stringify(summary) }] };
      }
    );

    // ====================================================
    // 2. Menu & Catalogue (Token-Efficient)
    // ====================================================
    server.registerTool(
      "minerva_get_menu_items",
      {
        title: "Articles du Menu",
        description: "Catalogue des plats : prix, catégorie, statut actif, coût matière.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            category: z.string().optional().describe("Filtrer par catégorie"),
            activeOnly: z.boolean().optional().default(false),
            format: z.enum(["compact", "full"]).optional().default("compact").describe("Mode 'compact' pour économiser des tokens"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, category, activeOnly, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        let query = supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("category").order("name");
        if (category) query = query.eq("category", category);
        if (activeOnly) query = query.eq("active", true);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

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
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_manage_menu_item",
      {
        title: "Gérer un plat du Menu",
        description: "Créer, modifier, activer/désactiver ou supprimer un plat.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            action: z.enum(["create", "update", "toggle_availability", "delete"]),
            itemId: z.string().uuid().optional(),
            name: z.string().optional(),
            category: z.string().optional(),
            price: z.number().optional().describe("Prix en dollars"),
            foodCost: z.number().optional().describe("Coût matière"),
            description: z.string().optional(),
            active: z.boolean().optional(),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, action, itemId, name, category, price, foodCost, description, active }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        if (action === "create") {
          if (!name || price === undefined) {
            return { content: [{ type: "text" as const, text: "name et price requis." }], isError: true };
          }
          const { data, error } = await supabase
            .from("menu_items")
            .insert({
              restaurant_id: restaurantId,
              name,
              category: category ?? null,
              price,
              food_cost: foodCost ?? 0,
              description: description ?? null,
              active: active ?? true,
            })
            .select("id, name, price, active")
            .single();
          if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
          return { content: [{ type: "text" as const, text: JSON.stringify({ created: data }) }] };
        }

        if (!itemId) return { content: [{ type: "text" as const, text: "itemId requis." }], isError: true };

        if (action === "toggle_availability") {
          const { data: current } = await supabase.from("menu_items").select("active").eq("id", itemId).eq("restaurant_id", restaurantId).maybeSingle();
          if (!current) return { content: [{ type: "text" as const, text: "Plat introuvable." }], isError: true };
          const nextActive = active !== undefined ? active : !current.active;
          const { data, error } = await supabase
            .from("menu_items")
            .update({ active: nextActive })
            .eq("id", itemId)
            .eq("restaurant_id", restaurantId)
            .select("id, name, active")
            .single();
          if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
          return { content: [{ type: "text" as const, text: JSON.stringify({ toggled: data }) }] };
        }

        if (action === "update") {
          const patch: Record<string, unknown> = {};
          if (name !== undefined) patch.name = name;
          if (category !== undefined) patch.category = category;
          if (price !== undefined) patch.price = price;
          if (foodCost !== undefined) patch.food_cost = foodCost;
          if (description !== undefined) patch.description = description;
          if (active !== undefined) patch.active = active;

          const { data, error } = await supabase
            .from("menu_items")
            .update(patch)
            .eq("id", itemId)
            .eq("restaurant_id", restaurantId)
            .select("id, name, price, active")
            .single();
          if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
          return { content: [{ type: "text" as const, text: JSON.stringify({ updated: data }) }] };
        }

        if (action === "delete") {
          const { error } = await supabase.from("menu_items").delete().eq("id", itemId).eq("restaurant_id", restaurantId);
          if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
          return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: itemId }) }] };
        }

        return { content: [{ type: "text" as const, text: "Action non reconnue." }], isError: true };
      }
    );

    // ====================================================
    // 3. Commandes (Token-Efficient)
    // ====================================================
    server.registerTool(
      "minerva_get_orders",
      {
        title: "Commandes",
        description: "Liste des commandes : articles, statut, total, invité.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            status: z.enum(["nouvelle", "en_preparation", "prete", "servie", "annulee"]).optional(),
            limit: z.number().int().min(1).max(50).default(15),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, status, limit, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        let query = supabase
          .from("orders")
          .select("id, status, guest_name, guest_phone, total, subtotal, payment_status, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((o) => ({
            id: o.id,
            status: o.status,
            name: o.guest_name,
            total: o.total,
            time: o.created_at?.slice(11, 16),
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_update_order_status",
      {
        title: "Statut d'une commande",
        description: "Fait progresser le statut d'une commande.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            orderId: z.string().uuid(),
            status: z.enum(["nouvelle", "en_preparation", "prete", "servie", "annulee"]),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, orderId, status }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { error } = await supabase.from("orders").update({ status }).eq("id", orderId).eq("restaurant_id", restaurantId);
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ updated: orderId, status }) }] };
      }
    );

    // ====================================================
    // 4. Réservations
    // ====================================================
    server.registerTool(
      "minerva_get_reservations",
      {
        title: "Réservations de tables",
        description: "Liste des réservations de tables.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            date: z.string().optional().describe("YYYY-MM-DD (défaut: aujourd'hui)"),
            status: z.enum(["confirmee", "arrivee", "terminee", "annulee", "no_show"]).optional(),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, date, status, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const targetDate = date || new Date().toISOString().slice(0, 10);
        const dayStart = `${targetDate}T00:00:00.000Z`;
        const dayEnd = `${targetDate}T23:59:59.999Z`;

        let query = supabase
          .from("reservations")
          .select("id, guest_name, party_size, reservation_time, status, notes, table_id")
          .eq("restaurant_id", restaurantId)
          .gte("reservation_time", dayStart)
          .lte("reservation_time", dayEnd)
          .order("reservation_time", { ascending: true });

        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((r) => ({
            id: r.id,
            guest: r.guest_name,
            size: r.party_size,
            time: r.reservation_time?.slice(11, 16),
            status: r.status,
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_update_reservation_status",
      {
        title: "Statut d'une réservation",
        description: "Met à jour une réservation.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            reservationId: z.string().uuid(),
            status: z.enum(["confirmee", "arrivee", "terminee", "annulee", "no_show"]),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, reservationId, status }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { error } = await supabase.from("reservations").update({ status }).eq("id", reservationId).eq("restaurant_id", restaurantId);
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ updated: reservationId, status }) }] };
      }
    );

    // ====================================================
    // 5. Stocks & Inventaire
    // ====================================================
    server.registerTool(
      "minerva_get_inventory",
      {
        title: "Inventaire et Stocks",
        description: "Articles en stock, quantités et alertes de seuil.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            lowStockOnly: z.boolean().optional().default(false),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, lowStockOnly, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { data, error } = await supabase
          .from("inventory_items")
          .select("id, name, category, unit, quantity_on_hand, par_level, unit_cost")
          .eq("restaurant_id", restaurantId)
          .order("name");

        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        let items = (data as { id: string; name: string; category: string | null; unit: string; quantity_on_hand: number; par_level: number | null; unit_cost: number }[]) ?? [];
        if (lowStockOnly) {
          items = items.filter((i) => i.par_level !== null && i.quantity_on_hand <= i.par_level);
        }

        if (format === "compact") {
          const compact = items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.quantity_on_hand,
            unit: i.unit,
            par: i.par_level,
            alert: i.par_level !== null && i.quantity_on_hand <= i.par_level,
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_update_stock_level",
      {
        title: "Mouvement de stock",
        description: "Enregistre un mouvement de stock (réception, utilisation, gaspillage, ajustement).",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            itemId: z.string().uuid(),
            type: z.enum(["reception", "utilisation", "gaspillage", "ajustement"]),
            quantity: z.number().positive(),
            reason: z.string().optional(),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, itemId, type, quantity, reason }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const delta = type === "reception" || type === "ajustement" ? quantity : -quantity;
        await supabase.from("inventory_movements").insert({
          inventory_item_id: itemId,
          type,
          quantity,
          reason: reason ?? `Action MCP (${type})`,
        });

        const { data: updatedItem, error: rpcError } = await supabase.rpc("increment_inventory_quantity", {
          p_item_id: itemId,
          p_delta: delta,
        });

        if (rpcError) return { content: [{ type: "text" as const, text: `Erreur: ${rpcError.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ item: updatedItem }) }] };
      }
    );

    // ====================================================
    // 6. Fidélisation & Clients
    // ====================================================
    server.registerTool(
      "minerva_get_customers",
      {
        title: "Clients & Fidélité",
        description: "Fiches clients, points fidélité, visites et dépenses.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            search: z.string().optional(),
            limit: z.number().int().min(1).max(50).default(20),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, search, limit, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        let query = supabase
          .from("customers")
          .select("id, name, email, phone, visit_count, total_spent, loyalty_points, last_visit_at")
          .eq("restaurant_id", restaurantId)
          .order("visit_count", { ascending: false })
          .limit(limit);

        if (search) query = query.ilike("name", `%${search}%`);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            visits: c.visit_count,
            spent: c.total_spent,
            points: c.loyalty_points,
            lastVisit: c.last_visit_at?.slice(0, 10),
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_create_loyalty_campaign",
      {
        title: "Créer une campagne marketing / fidélité",
        description: "Planifie une campagne promotionnelle pour stimuler les visites.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            name: z.string(),
            description: z.string().optional(),
            channel: z.enum(["email", "sms", "push", "social", "sur_place"]),
            type: z.enum(["reduction", "points_doubles", "menu_special", "evenement", "autre"]),
            startDate: z.string(),
            endDate: z.string().optional(),
            cost: z.number().optional().default(0),
            estimatedRevenue: z.number().optional().default(0),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, name, description, channel, type, startDate, endDate, cost, estimatedRevenue }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { data, error } = await supabase
          .from("campaigns")
          .insert({
            restaurant_id: restaurantId,
            name,
            description: description ?? null,
            channel,
            type,
            start_date: startDate,
            end_date: endDate || null,
            cost: cost ?? 0,
            status: "planifiee",
            estimated_revenue: estimatedRevenue ?? 0,
          })
          .select("id, name, status")
          .single();

        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ created: data }) }] };
      }
    );

    server.registerTool(
      "minerva_get_referral_roi_and_ambassadors",
      {
        title: "ROI Parrainage & Meilleurs Ambassadeurs",
        description: "Analyse du bouche-à-oreille : clics, filleuls convertis, CA généré, coût des récompenses, ROI net et Top ambassadeurs.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { computeReferralRoiMetrics, getTopAmbassadors } = await import("@/lib/data/referral-roi");
        const [roi, ambassadors] = await Promise.all([
          computeReferralRoiMetrics(restaurantId),
          getTopAmbassadors(restaurantId, 5),
        ]);

        if (format === "compact") {
          const compact = {
            clicks: roi.totalClicks,
            convs: roi.totalConversions,
            rate: `${roi.conversionRatePct}%`,
            revenue: roi.totalRevenueGenerated,
            cost: roi.estimatedRewardsCost,
            multiplier: `${roi.roiMultiplier}x`,
            topAmbassadors: ambassadors.map((a) => ({ name: a.customerName, convs: a.referralConversions, rev: a.revenueGenerated })),
          };
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ roi, ambassadors }, null, 2) }] };
      }
    );

    // ====================================================
    // 7. KPIs & Finances
    // ====================================================
    server.registerTool(
      "minerva_get_financial_kpis",
      {
        title: "KPIs Financiers",
        description: "Chiffre d'affaires, transactions et journées de service récentes.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            limit: z.number().int().min(1).max(30).default(10),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, limit, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const [{ data: transactions, error: txError }, { data: serviceDays, error: daysError }] = await Promise.all([
          supabase.from("financial_transactions").select("date, description, amount, direction, category").eq("restaurant_id", restaurantId).order("date", { ascending: false }).limit(limit),
          supabase.from("service_days").select("date, revenue, order_count, cover_count").eq("restaurant_id", restaurantId).order("date", { ascending: false }).limit(limit),
        ]);

        if (txError || daysError) return { content: [{ type: "text" as const, text: `Erreur: ${(txError || daysError)?.message}` }], isError: true };

        if (format === "compact") {
          const compact = {
            days: (serviceDays ?? []).map((d) => ({ date: d.date, rev: d.revenue, orders: d.order_count })),
            txns: (transactions ?? []).map((t) => ({ date: t.date, desc: t.description, amt: t.amount, dir: t.direction, cat: t.category })),
          };
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ serviceDays, transactions }, null, 2) }] };
      }
    );

    // ====================================================
    // 8. Collaborateurs & Horaires (Nouveau / Complet)
    // ====================================================
    server.registerTool(
      "minerva_get_employees_and_shifts",
      {
        title: "Équipe et Plannings / Shifts",
        description: "Liste des collaborateurs, rôles, taux horaires et quarts de travail récents.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            activeOnly: z.boolean().optional().default(true),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, activeOnly, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        let query = supabase.from("employees").select("id, full_name, role_title, hourly_wage, active, contact_email").eq("restaurant_id", restaurantId).order("full_name");
        if (activeOnly) query = query.eq("active", true);

        const { data: employees, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (employees ?? []).map((e) => ({
            id: e.id,
            name: e.full_name,
            role: e.role_title,
            wage: e.hourly_wage,
            active: e.active,
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(employees ?? [], null, 2) }] };
      }
    );

    // ====================================================
    // 9. Alertes & Résolution d'Anomalies (Nouveau / Complet)
    // ====================================================
    server.registerTool(
      "minerva_get_alerts",
      {
        title: "Alertes d'exploitation et Dérives",
        description: "Anomalies détectées (baisse de revenu, pic de dépense, rupture imminente).",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            status: z.enum(["nouvelle", "revue", "assignee", "all"]).optional().default("nouvelle"),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, status, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        let query = supabase.from("alerts").select("id, type, severity, title, detail, status, created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(20);
        if (status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((a) => ({
            id: a.id,
            sev: a.severity,
            title: a.title,
            detail: a.detail,
            status: a.status,
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_resolve_alert",
      {
        title: "Acquitter ou Assigner une alerte",
        description: "Marque une alerte comme revue ou assignée.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            alertId: z.string().uuid(),
            status: z.enum(["revue", "assignee"]),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, alertId, status }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { error } = await supabase.from("alerts").update({ status }).eq("id", alertId).eq("restaurant_id", restaurantId);
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ resolved: alertId, status }) }] };
      }
    );

    // ====================================================
    // 10. Avis & Feedback IA (Nouveau / Complet)
    // ====================================================
    server.registerTool(
      "minerva_get_reviews_and_feedback",
      {
        title: "Avis & Synthèses IA",
        description: "Revues analytiques périodiques et points forts/faibles détectés par l'IA.",
        inputSchema: z
          .object({
            restaurantId: z.string().uuid().optional(),
            limit: z.number().int().min(1).max(10).default(3),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ restaurantId: explicitId, limit, format }, ctx) => {
        const supabase = createAdminClient();
        const restaurantId = await resolveRestaurantId(supabase, explicitId, authRestaurantIdFrom(ctx));
        if (!restaurantId) return { content: [{ type: "text" as const, text: "Restaurant introuvable" }], isError: true };

        const { data, error } = await supabase.from("ai_reviews").select("id, period_start, period_end, strengths, weaknesses, recommendations, created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(limit);
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((r) => ({
            id: r.id,
            period: `${r.period_start} -> ${r.period_end}`,
            strengths: r.strengths?.slice(0, 2),
            weaknesses: r.weaknesses?.slice(0, 2),
            recs: r.recommendations?.slice(0, 2),
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    // ====================================================
    // 11. Prospection & Audits (Token-Efficient)
    // ====================================================
    server.registerTool(
      "minerva_get_prospects",
      {
        title: "Prospects & Leads Reach",
        description: "Restaurants cibles du pipeline de prospection.",
        inputSchema: z
          .object({
            status: z.enum(["draft", "nouveau", "ready", "contacte", "audit_envoye", "relance_1", "relance_2", "rdv_fixe", "converti", "decline", "all"]).optional().default("all"),
            limit: z.number().int().min(1).max(100).default(20),
            format: z.enum(["compact", "full"]).optional().default("compact"),
          })
          .strict(),
      },
      async ({ status, limit, format }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from("prospects")
          .select("id, restaurant_name, source_url, source_platform, status, demo_slug, commission_rate_pct, assumed_monthly_orders, demo_view_count, contacted_at, audit_generated_at, notes, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (status && status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        if (format === "compact") {
          const compact = (data ?? []).map((p) => ({
            id: p.id,
            name: p.restaurant_name,
            status: p.status,
            rate: p.commission_rate_pct,
            views: p.demo_view_count,
            slug: p.demo_slug,
            contacted: p.contacted_at?.slice(0, 10),
          }));
          return { content: [{ type: "text" as const, text: JSON.stringify(compact) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      }
    );

    server.registerTool(
      "minerva_create_prospect",
      {
        title: "Créer un prospect",
        description: "Ajoute un restaurant dans le pipeline.",
        inputSchema: z
          .object({
            restaurantName: z.string(),
            sourceUrl: z.string(),
            sourcePlatform: z.enum(["uber_eats", "doordash", "skipthedishes", "direct_website", "raw_text", "other"]).optional().default("direct_website"),
            commissionRatePct: z.number().optional().default(30),
            assumedMonthlyOrders: z.number().optional().default(400),
            detectedAddress: z.string().optional(),
            notes: z.string().optional(),
          })
          .strict(),
      },
      async ({ restaurantName, sourceUrl, sourcePlatform, commissionRatePct, assumedMonthlyOrders, detectedAddress, notes }) => {
        const supabase = createAdminClient();
        const demoSlug = generateDemoSlug(restaurantName);

        const { data, error } = await supabase
          .from("prospects")
          .insert({
            restaurant_name: restaurantName.trim(),
            source_url: sourceUrl.trim(),
            source_platform: sourcePlatform,
            currency: "CAD",
            commission_rate_pct: commissionRatePct,
            assumed_monthly_orders: assumedMonthlyOrders,
            detected_address: detectedAddress || null,
            status: "ready",
            demo_slug: demoSlug,
            notes: notes || null,
            menu_json: { categories: [] },
          })
          .select("id, restaurant_name, status, demo_slug")
          .single();

        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };
        return { content: [{ type: "text" as const, text: JSON.stringify({ created: data, demoUrl: getDemoUrl(demoSlug) }) }] };
      }
    );

    server.registerTool(
      "minerva_sync_reach_leads",
      {
        title: "Synchronisation de masse Leads Reach",
        description: "Importe ou synchronise plusieurs leads provenant de Reach en une seule passe.",
        inputSchema: z
          .object({
            leads: z.array(
              z.object({
                restaurantName: z.string(),
                sourceUrl: z.string().optional(),
                commissionRatePct: z.number().optional().default(30),
                contactEmail: z.string().optional(),
                contactPhone: z.string().optional(),
                notes: z.string().optional(),
              })
            ),
          })
          .strict(),
      },
      async ({ leads }) => {
        const supabase = createAdminClient();
        let imported = 0;

        for (const l of leads) {
          const demoSlug = generateDemoSlug(l.restaurantName);
          const fullNotes = [l.notes, l.contactEmail ? `Email: ${l.contactEmail}` : null, l.contactPhone ? `Tél: ${l.contactPhone}` : null].filter(Boolean).join(" | ");

          const { error } = await supabase.from("prospects").insert({
            restaurant_name: l.restaurantName.trim(),
            source_url: l.sourceUrl?.trim() || "https://example.com",
            source_platform: "other",
            currency: "CAD",
            commission_rate_pct: l.commissionRatePct,
            assumed_monthly_orders: 400,
            status: "nouveau",
            demo_slug: demoSlug,
            notes: fullNotes || null,
            menu_json: { categories: [] },
          });

          if (!error) imported++;
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ total: leads.length, imported }) }] };
      }
    );

    server.registerTool(
      "minerva_run_prospect_audit",
      {
        title: "Audit de prospect IA",
        description: "Lance le diagnostic technique et analyse des marges d'un prospect.",
        inputSchema: z
          .object({
            prospectId: z.string().uuid(),
            url: z.string().optional(),
          })
          .strict(),
      },
      async ({ prospectId, url: explicitUrl }) => {
        const supabase = createAdminClient();
        const { data: prospect, error: fetchErr } = await supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle();
        if (fetchErr || !prospect) return { content: [{ type: "text" as const, text: "Prospect introuvable." }], isError: true };

        const targetUrl = explicitUrl || prospect.source_url;
        const enriched = await generateEnrichedProspectAudit({
          restaurantName: prospect.restaurant_name,
          websiteUrl: targetUrl,
          menu: prospect.menu_json,
          commissionRatePct: Number(prospect.commission_rate_pct || 30),
          assumedMonthlyOrders: Number(prospect.assumed_monthly_orders || 400),
        });

        await supabase
          .from("prospects")
          .update({
            audit_report: enriched.technicalAudit,
            audit_generated_at: enriched.technicalAudit.fetchedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prospectId);

        const compactAudit = {
          score: enriched.technicalAudit.score,
          loss: enriched.monthlyCommissionLoss,
          strengths: enriched.keyFindings.strengths,
          weaknesses: enriched.keyFindings.weaknesses,
          opportunities: enriched.keyFindings.opportunities,
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(compactAudit) }] };
      }
    );

    server.registerTool(
      "minerva_send_prospect_audit",
      {
        title: "Envoyer l'audit par courriel",
        description: "Envoie l'audit et la démo interactive via Resend.",
        inputSchema: z
          .object({
            prospectId: z.string().uuid(),
            recipientEmail: z.string().email(),
            customMessage: z.string().optional(),
          })
          .strict(),
      },
      async ({ prospectId, recipientEmail, customMessage }) => {
        const supabase = createAdminClient();
        const { data: row, error: fetchErr } = await supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle();
        if (fetchErr || !row) return { content: [{ type: "text" as const, text: "Prospect introuvable." }], isError: true };

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
          to: recipientEmail,
          prospect,
          customMessage,
        });

        if (!result.ok) return { content: [{ type: "text" as const, text: `Échec: ${result.error}` }], isError: true };

        await supabase.from("prospects").update({ status: "audit_envoye", contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", prospectId);
        return { content: [{ type: "text" as const, text: JSON.stringify({ sent: true, recipient: recipientEmail, nextStatus: "audit_envoye" }) }] };
      }
    );

    server.registerTool(
      "minerva_trigger_prospect_relance",
      {
        title: "Déclencher une relance de prospection",
        description: "Envoie un courriel de relance (Étape 1 ou 2) et met à jour le pipeline.",
        inputSchema: z
          .object({
            prospectId: z.string().uuid(),
            step: z.union([z.literal(1), z.literal(2)]),
            recipientEmail: z.string().email(),
            customMessage: z.string().optional(),
          })
          .strict(),
      },
      async ({ prospectId, step, recipientEmail, customMessage }) => {
        const supabase = createAdminClient();
        const { data: row, error: fetchErr } = await supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle();
        if (fetchErr || !row) return { content: [{ type: "text" as const, text: "Prospect introuvable." }], isError: true };

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
          to: recipientEmail,
          prospect,
          step,
          customMessage,
        });

        if (!result.ok) return { content: [{ type: "text" as const, text: `Échec: ${result.error}` }], isError: true };

        const nextStatus = step === 1 ? "relance_1" : "relance_2";
        const nowIso = new Date().toISOString();
        const updatedNotes = [row.notes, `[${nowIso.slice(0, 10)}] Relance ${step} envoyée à ${recipientEmail}`].filter(Boolean).join("\n");

        await supabase.from("prospects").update({ status: nextStatus, contacted_at: nowIso, notes: updatedNotes, updated_at: nowIso }).eq("id", prospectId);
        return { content: [{ type: "text" as const, text: JSON.stringify({ sent: true, step, recipient: recipientEmail, nextStatus }) }] };
      }
    );

    server.registerTool(
      "minerva_get_prospects_due_for_followup",
      {
        title: "Prospects en attente de relance",
        description: "Identifie les prospects éligibles à une relance (J+2 après audit, J+3 après relance 1).",
        inputSchema: z.object({}).strict(),
      },
      async () => {
        const supabase = createAdminClient();
        const { data, error } = await supabase.from("prospects").select("id, restaurant_name, status, contacted_at, created_at, demo_slug").order("created_at", { ascending: false });
        if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }], isError: true };

        const now = Date.now();
        const dueList: { id: string; name: string; status: string; step: 1 | 2; daysSince: number; slug: string | null }[] = [];

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

        return { content: [{ type: "text" as const, text: JSON.stringify(dueList) }] };
      }
    );

    // ====================================================
    // 10. Diagnostic & Healthcheck Base de Données Live
    // ====================================================
    server.registerTool(
      "minerva_system_health",
      {
        title: "Santé du Système & Diagnostic Base de Données",
        description: "Vérifie la connexion active en temps réel à Supabase et compte les enregistrements réels dans chaque table (zéro mock).",
        inputSchema: z.object({}).strict(),
      },
      async () => {
        const start = Date.now();
        const supabase = createAdminClient();

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

        const latencyMs = Date.now() - start;

        if (errRest) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ dbConnected: false, error: errRest.message, latencyMs }) }],
            isError: true,
          };
        }

        const health = {
          dbConnected: true,
          provider: "Supabase Live Database",
          latencyMs,
          counts: {
            restaurants: restCount ?? 0,
            menuItems: menuCount ?? 0,
            orders: orderCount ?? 0,
            customers: customerCount ?? 0,
            prospects: prospectCount ?? 0,
          },
          verifiedAt: new Date().toISOString(),
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(health) }] };
      }
    );
  },
  { serverInfo: { name: "minerva-flow-mcp", version: "1.2.0" } }
);

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST };
