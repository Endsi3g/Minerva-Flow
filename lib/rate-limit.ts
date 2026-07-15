import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Best-effort client IP for rate-limiting anonymous requests (public
 * invite/share pages). Vercel sets x-forwarded-for; falls back to a
 * constant bucket if it's ever missing (e.g. local dev), which just means
 * local requests share one bucket rather than being unlimited.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Sliding-window rate limit backed by a Supabase table (rate_limit_hits)
 * instead of Redis — no new external service to provision. Counts hits for
 * `key` within the last `windowSeconds`; records this attempt regardless
 * of outcome so a sustained attacker doesn't get free retries.
 */
export async function checkRateLimit(
  key: string,
  opts: { max: number; windowSeconds: number }
): Promise<{ allowed: boolean }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();

  const { count } = await admin
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("rate_key", key)
    .gte("created_at", since);

  const currentCount = count ?? 0;
  if (currentCount >= opts.max) {
    return { allowed: false };
  }

  await admin.from("rate_limit_hits").insert({ rate_key: key });

  // Opportunistic cleanup of this key's stale rows — avoids needing a
  // separate cron job just to keep the table small.
  await admin.from("rate_limit_hits").delete().eq("rate_key", key).lt("created_at", since);

  return { allowed: true };
}
