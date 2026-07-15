import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemberCalendarConnection = {
  connected: boolean;
  googleEmail: string | null;
};

/** Whether the current signed-in user has connected their own Google Calendar. */
export async function getMyCalendarConnection(): Promise<MemberCalendarConnection> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, googleEmail: null };

  const { data } = await supabase
    .from("member_calendar_connections")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  return { connected: Boolean(data), googleEmail: data?.google_email ?? null };
}

export async function disconnectMyCalendar(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("member_calendar_connections").delete().eq("user_id", user.id);
}

/**
 * Server-only (service role) — writes tokens from the OAuth callback,
 * which runs without the user's session cookie context readily usable for
 * a write like this (mirrors savePosConnectionTokens/saveGoogleTokens).
 */
export async function saveMemberCalendarTokens(
  userId: string,
  restaurantId: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: string; googleEmail?: string }
): Promise<void> {
  const admin = createAdminClient();

  const { data: accessTokenId } = await admin.rpc("store_vault_secret", {
    secret: tokens.accessToken,
    secret_name: `member_calendar_access_${userId}_${Date.now()}`,
  });

  let refreshTokenId: string | null = null;
  if (tokens.refreshToken) {
    const { data } = await admin.rpc("store_vault_secret", {
      secret: tokens.refreshToken,
      secret_name: `member_calendar_refresh_${userId}_${Date.now()}`,
    });
    refreshTokenId = data ?? null;
  }

  await admin.from("member_calendar_connections").upsert(
    {
      user_id: userId,
      restaurant_id: restaurantId,
      google_email: tokens.googleEmail ?? null,
      access_token_id: accessTokenId ?? null,
      refresh_token_id: refreshTokenId,
      expires_at: tokens.expiresAt ?? null,
    },
    { onConflict: "user_id" }
  );
}

/** Server-only — reads the access token for a given user, used to fetch their calendar events. */
export async function getMemberCalendarAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("member_calendar_connections")
    .select("access_token_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection?.access_token_id) return null;
  const { data } = await admin.rpc("read_vault_secret", { secret_id: connection.access_token_id });
  return data ?? null;
}
