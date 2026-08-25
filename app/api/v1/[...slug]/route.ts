import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { executeMcpTool } from "@/lib/mcp/tools-registry";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function authenticateRequest(
  req: NextRequest
): Promise<{ authenticated: boolean; clientId?: string; restaurantId?: string | null }> {
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

  // System-level tokens (.env) are unscoped admin credentials; dynamic per-restaurant keys
  // are hard-locked to the restaurant they were issued for — that scoping MUST be enforced
  // downstream by resolveRestaurantId, never left to whatever restaurantId the caller passes.
  if (serverToken && safeEqual(token, serverToken)) {
    return { authenticated: true, clientId: "server-env", restaurantId: null };
  }
  if (hermesToken && safeEqual(token, hermesToken)) {
    return { authenticated: true, clientId: "hermes-env", restaurantId: null };
  }

  try {
    const { verifyDynamicApiKey } = await import("@/lib/data/api-keys");
    const dynamicAuth = await verifyDynamicApiKey(token);
    if (dynamicAuth) {
      return { authenticated: true, clientId: dynamicAuth.clientId, restaurantId: dynamicAuth.restaurantId };
    }
  } catch {
    // ignore
  }

  return { authenticated: false };
}

const REST_TO_MCP_MAP: Record<string, string> = {
  "restaurant/summary": "minerva_get_restaurant_summary",
  "restaurant/menu": "minerva_get_menu_items",
  "restaurant/menu/manage": "minerva_manage_menu_item",
  "restaurant/orders": "minerva_get_orders",
  "restaurant/orders/status": "minerva_update_order_status",
  "restaurant/reservations": "minerva_get_reservations",
  "restaurant/reservations/status": "minerva_update_reservation_status",
  "restaurant/inventory": "minerva_get_inventory",
  "restaurant/inventory/update": "minerva_update_stock_level",
  "restaurant/alerts": "minerva_get_alerts",
  "restaurant/alerts/resolve": "minerva_resolve_alert",
  "restaurant/employees": "minerva_get_employees_and_shifts",
  "restaurant/kpis": "minerva_get_financial_kpis",
  "loyalty/customers": "minerva_get_customers",
  "loyalty/referral-roi": "minerva_get_referral_roi_and_ambassadors",
  "loyalty/campaigns/create": "minerva_create_loyalty_campaign",
  "loyalty/reviews": "minerva_get_reviews_and_feedback",
  "prospects/list": "minerva_get_prospects",
  "prospects/create": "minerva_create_prospect",
  "prospects/sync-reach": "minerva_sync_reach_leads",
  "prospects/audit": "minerva_run_prospect_audit",
  "prospects/send-audit": "minerva_send_prospect_audit",
  "prospects/relance": "minerva_trigger_prospect_relance",
  "prospects/due-followups": "minerva_get_prospects_due_for_followup",
  "system/health": "minerva_system_health",
};

async function dispatchAction(endpoint: string, payload: Record<string, unknown>, authRestaurantId: string | null) {
  // 1. Direct tool ID or direct REST mapping
  let toolId = REST_TO_MCP_MAP[endpoint] || endpoint;
  if (endpoint.startsWith("tools/")) {
    toolId = endpoint.replace("tools/", "");
  }

  return executeMcpTool(toolId, payload, authRestaurantId);
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

  const res = await dispatchAction(endpoint, searchParamsObj, auth.restaurantId ?? null);
  return NextResponse.json(
    { ok: res.success, data: res.data, error: res.error },
    { status: res.success ? 200 : 400, headers: { "Access-Control-Allow-Origin": "*" } }
  );
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

  const res = await dispatchAction(endpoint, body, auth.restaurantId ?? null);
  return NextResponse.json(
    { ok: res.success, data: res.data, error: res.error },
    { status: res.success ? 200 : 400, headers: { "Access-Control-Allow-Origin": "*" } }
  );
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
