import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "node:crypto";
import { computeReferralRoiMetrics, getTopAmbassadors } from "@/lib/data/referral-roi";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function authenticateRequest(req: NextRequest): Promise<{ authenticated: boolean; clientId?: string }> {
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  const queryApiKey = req.nextUrl.searchParams.get("api_key") || req.nextUrl.searchParams.get("token");

  let token = xApiKey || queryApiKey || undefined;
  if (!token && authHeader) {
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  }

  if (!token) return { authenticated: false };

  const serverToken = process.env.MCP_SERVER_TOKEN;
  const hermesToken = process.env.MCP_HERMES_TOKEN;

  if (serverToken && safeEqual(token, serverToken)) {
    return { authenticated: true, clientId: "server-env" };
  }
  if (hermesToken && safeEqual(token, hermesToken)) {
    return { authenticated: true, clientId: "hermes-env" };
  }

  try {
    const { verifyDynamicApiKey } = await import("@/lib/data/api-keys");
    const dynamicAuth = await verifyDynamicApiKey(token);
    if (dynamicAuth) {
      return { authenticated: true, clientId: dynamicAuth.clientId };
    }
  } catch {
    // ignore
  }

  return { authenticated: false };
}

async function resolveRestaurantId(supabase: ReturnType<typeof createAdminClient>, explicitId?: string): Promise<string | null> {
  if (explicitId) return explicitId;
  const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function handleAction(endpoint: string, method: string, payload: Record<string, unknown>) {
  const supabase = createAdminClient();
  const explicitRestaurantId = typeof payload.restaurantId === "string" ? payload.restaurantId : undefined;
  const restaurantId = await resolveRestaurantId(supabase, explicitRestaurantId);

  switch (endpoint) {
    case "restaurant/summary": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        { data: restaurant },
        { count: todayOrdersCount },
        { data: todayOrders },
        { count: todayReservationsCount },
        { count: lowStockCount },
      ] = await Promise.all([
        supabase.from("restaurants").select("name, city, currency").eq("id", restaurantId).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
        supabase.from("orders").select("total, status").eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("reservation_time", todayStart.toISOString()),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).lt("quantity_on_hand", 5),
      ]);

      const todayRevenue = (todayOrders as { total: number }[] ?? []).reduce((sum, o) => sum + (o.total || 0), 0);

      return {
        restaurant: (restaurant as { name: string; city: string; currency: string } | null)?.name,
        city: (restaurant as { name: string; city: string; currency: string } | null)?.city,
        ordersToday: todayOrdersCount ?? 0,
        revenueToday: Math.round(todayRevenue * 100) / 100,
        reservationsToday: todayReservationsCount ?? 0,
        stockAlerts: lowStockCount ?? 0,
      };
    }

    case "restaurant/menu": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, price, category, food_cost, active")
        .eq("restaurant_id", restaurantId)
        .limit(50);
      return data ?? [];
    }

    case "loyalty/referral-roi": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const [roi, ambassadors] = await Promise.all([
        computeReferralRoiMetrics(restaurantId),
        getTopAmbassadors(restaurantId, 5),
      ]);
      return {
        clicks: roi.totalClicks,
        conversions: roi.totalConversions,
        rate: `${roi.conversionRatePct}%`,
        revenue: roi.totalRevenueGenerated,
        cost: roi.estimatedRewardsCost,
        multiplier: `${roi.roiMultiplier}x`,
        topAmbassadors: ambassadors.map((a) => ({ name: a.customerName, conversions: a.referralConversions, revenue: a.revenueGenerated })),
      };
    }

    case "prospects/list": {
      const { data } = await supabase
        .from("prospects")
        .select("id, restaurant_name, contact_name, email, city, commission_rate_pct, status, demo_slug")
        .order("created_at", { ascending: false })
        .limit(25);
      return data ?? [];
    }

    case "restaurant/orders": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, order_type, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    }

    case "restaurant/reservations": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const { data } = await supabase
        .from("reservations")
        .select("id, customer_name, party_size, reservation_time, status, table_number")
        .eq("restaurant_id", restaurantId)
        .order("reservation_time", { ascending: false })
        .limit(20);
      return data ?? [];
    }

    case "restaurant/inventory": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const { data } = await supabase
        .from("inventory_items")
        .select("id, name, quantity_on_hand, unit, unit_cost")
        .eq("restaurant_id", restaurantId)
        .limit(50);
      return data ?? [];
    }

    case "restaurant/alerts": {
      if (!restaurantId) return { error: "Restaurant introuvable" };
      const { data } = await supabase
        .from("alerts")
        .select("id, type, severity, message, resolved, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("resolved", false)
        .limit(20);
      return data ?? [];
    }

    default:
      return { error: `Endpoint non reconnu : /api/v1/${endpoint}` };
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const endpoint = (slug || []).join("/");

  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé : Clé API manquante ou invalide. Fournissez un header 'Authorization: Bearer <key>' ou 'x-api-key: <key>'." },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const searchParamsObj: Record<string, unknown> = {};
  req.nextUrl.searchParams.forEach((val, key) => {
    searchParamsObj[key] = val;
  });

  const result = await handleAction(endpoint, "GET", searchParamsObj);
  return NextResponse.json({ ok: !("error" in (result as Record<string, unknown>)), data: result }, {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const endpoint = (slug || []).join("/");

  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé : Clé API manquante ou invalide. Fournissez un header 'Authorization: Bearer <key>' ou 'x-api-key: <key>'." },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body
  }

  const result = await handleAction(endpoint, "POST", body);
  return NextResponse.json({ ok: !("error" in (result as Record<string, unknown>)), data: result }, {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
