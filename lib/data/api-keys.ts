import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomBytes } from "node:crypto";

export type ApiKey = {
  id: string;
  restaurantId: string | null;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
  isEnvKey?: boolean;
};

export type CreatedApiKeyResult = {
  apiKey: ApiKey;
  rawToken: string;
};

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateRawApiKey(prefix = "mcp_live"): string {
  const randomStr = randomBytes(24).toString("hex");
  return `${prefix}_${randomStr}`;
}

export async function getApiKeys(restaurantId: string): Promise<ApiKey[]> {
  const supabase = await createClient();
  const keys: ApiKey[] = [];

  // 1. Env configured key (if set)
  if (process.env.MCP_SERVER_TOKEN) {
    const envToken = process.env.MCP_SERVER_TOKEN;
    const prefix = envToken.length > 8 ? `${envToken.slice(0, 7)}...` : "mcp_env...";
    keys.push({
      id: "env-server-token",
      restaurantId,
      name: "Clé Principale Système (.env)",
      keyPrefix: prefix,
      scopes: ["all:minerva-flow"],
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revoked: false,
      isEnvKey: true,
    });
  }

  if (process.env.MCP_HERMES_TOKEN) {
    const envToken = process.env.MCP_HERMES_TOKEN;
    const prefix = envToken.length > 8 ? `${envToken.slice(0, 7)}...` : "hermes_env...";
    keys.push({
      id: "env-hermes-token",
      restaurantId,
      name: "Clé Agent Hermes (.env)",
      keyPrefix: prefix,
      scopes: ["all:minerva-flow"],
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revoked: false,
      isEnvKey: true,
    });
  }

  // 2. Database keys
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      for (const row of data as { id: string; restaurant_id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; revoked: boolean }[]) {
        keys.push({
          id: row.id,
          restaurantId: row.restaurant_id,
          name: row.name,
          keyPrefix: row.key_prefix,
          scopes: row.scopes || ["all:minerva-flow"],
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
          revoked: row.revoked,
          isEnvKey: false,
        });
      }
    }
  } catch {
    // Database table might not be migrated yet in some test envs
  }

  return keys;
}

export async function createApiKey(
  restaurantId: string,
  name: string,
  scopes: string[] = ["all:minerva-flow"]
): Promise<CreatedApiKeyResult | null> {
  const supabase = await createClient();
  const rawToken = generateRawApiKey("mcp_live");
  const keyHash = hashApiKey(rawToken);
  const keyPrefix = `${rawToken.slice(0, 11)}...`;

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        revoked: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      // Return a temporary simulated in-memory representation if table is unavailable
      const fallbackKey: ApiKey = {
        id: `key-${Date.now()}`,
        restaurantId,
        name: name.trim(),
        keyPrefix,
        scopes,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revoked: false,
        isEnvKey: false,
      };
      return { apiKey: fallbackKey, rawToken };
    }

    const row = data as { id: string; restaurant_id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; revoked: boolean };
    const apiKey: ApiKey = {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      scopes: row.scopes,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revoked: row.revoked,
      isEnvKey: false,
    };

    return { apiKey, rawToken };
  } catch {
    return null;
  }
}

export async function revokeApiKey(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function deleteApiKey(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function verifyDynamicApiKey(token: string): Promise<{
  token: string;
  scopes: string[];
  clientId: string;
  restaurantId: string | null;
} | null> {
  const admin = createAdminClient();
  const keyHash = hashApiKey(token);

  try {
    const { data, error } = await admin
      .from("api_keys")
      .select("id, restaurant_id, name, scopes, revoked")
      .eq("key_hash", keyHash)
      .eq("revoked", false)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as { id: string; restaurant_id: string | null; name: string; scopes: string[]; revoked: boolean };

    // Update last_used_at asynchronously
    admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then();

    return {
      token,
      scopes: row.scopes || ["all:minerva-flow"],
      clientId: row.name,
      restaurantId: row.restaurant_id,
    };
  } catch {
    return null;
  }
}
