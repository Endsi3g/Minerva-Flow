import { createClient } from "@/lib/supabase/server";

export type DeviceSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  device: string;
  browser: string;
  ip: string | null;
  isCurrent: boolean;
};

type SessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  not_after: string | null;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
};

// GoTrue only stores the raw User-Agent header — no dependency pulled in
// just to label a device, this covers the handful of platforms/browsers
// that actually show up for a small restaurant team.
function parseUserAgent(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "Appareil inconnu", browser: "" };

  let device = "Ordinateur";
  if (/iphone/i.test(ua)) device = "iPhone";
  else if (/ipad/i.test(ua)) device = "iPad";
  else if (/android/i.test(ua)) device = /mobile/i.test(ua) ? "Téléphone Android" : "Tablette Android";
  else if (/macintosh|mac os x/i.test(ua)) device = "Mac";
  else if (/windows/i.test(ua)) device = "PC Windows";
  else if (/linux/i.test(ua)) device = "Ordinateur Linux";

  let browser = "Navigateur inconnu";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/headlesschrome/i.test(ua)) browser = "Chrome (automatisé)";
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = "Chrome";
  else if (/crios\//i.test(ua)) browser = "Chrome";
  else if (/fxios\/|firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  else if (ua === "node") browser = "Accès serveur/API";

  return { device, browser };
}

function mapSession(row: SessionRow): DeviceSession {
  const { device, browser } = parseUserAgent(row.user_agent);
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    device,
    browser,
    ip: row.ip ? row.ip.split("/")[0] : null,
    isCurrent: row.is_current,
  };
}

/**
 * The current user's own active sessions ("connected devices"), most
 * recently active first. Scoped server-side to auth.uid() inside the
 * list_my_sessions() RPC — no user id is ever passed in, so this can never
 * leak another account's sessions.
 */
export async function getMySessions(): Promise<DeviceSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_sessions");
  if (error || !data) return [];
  return (data as SessionRow[]).map(mapSession);
}

/**
 * Revokes one of the current user's own OTHER sessions (the RPC itself
 * refuses to revoke the caller's active session). Deletes the auth.sessions
 * row, which invalidates that device's refresh token — its current access
 * token keeps working for up to its own ~1h lifetime until it next tries to
 * refresh, since Supabase Auth has no instant remote-kill for live tokens.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_my_session", { p_session_id: sessionId });
  if (error) return false;
  return Boolean(data);
}
