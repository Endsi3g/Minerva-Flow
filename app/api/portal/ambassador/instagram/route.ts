import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  thumbnail_url?: string;
};
type Insight = { name: string; values?: { value: number }[]; total_value?: { value: number } };

async function readMediaInsights(base: string, mediaId: string, accessToken: string, metrics: string): Promise<Insight[]> {
  const url = new URL(`${base}/${encodeURIComponent(mediaId)}/insights`);
  url.searchParams.set("metric", metrics);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const body = await response.json() as { data?: Insight[] };
  return body.data ?? [];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Session requise." }, { status: 401 });

  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", user.id).maybeSingle();
  if (!ambassador) return NextResponse.json({ error: "Espace ambassadeur introuvable." }, { status: 403 });
  const { data: connection } = await admin.from("flow_ambassador_instagram_connections")
    .select("instagram_user_id, username, access_token_id, expires_at, connected_at")
    .eq("ambassador_id", ambassador.id).maybeSingle();
  if (!connection) return NextResponse.json({ error: "Instagram n’est pas connecté." }, { status: 404 });
  if (connection.expires_at && new Date(connection.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "L’autorisation Instagram a expiré. Reconnectez votre compte." }, { status: 409 });
  }

  const { data: accessToken, error: vaultError } = await admin.rpc("read_vault_secret", { secret_id: connection.access_token_id });
  if (vaultError || typeof accessToken !== "string" || !accessToken) return NextResponse.json({ error: "Jeton Instagram indisponible. Reconnectez le compte." }, { status: 503 });

  const base = "https://graph.instagram.com";
  const profileUrl = new URL(`${base}/me`);
  profileUrl.searchParams.set("fields", "id,username,account_type,media_count,followers_count");
  profileUrl.searchParams.set("access_token", accessToken);
  const profileResponse = await fetch(profileUrl, { cache: "no-store" });
  if (!profileResponse.ok) return NextResponse.json({ error: "Meta n’a pas autorisé la lecture du profil. Vérifiez les permissions de l’application." }, { status: 502 });
  const profile = await profileResponse.json() as { id?: string; username?: string; account_type?: string; media_count?: number; followers_count?: number };

  const mediaUrl = new URL(`${base}/${encodeURIComponent(connection.instagram_user_id)}/media`);
  mediaUrl.searchParams.set("fields", "id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url");
  mediaUrl.searchParams.set("limit", "50");
  mediaUrl.searchParams.set("access_token", accessToken);
  const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
  if (!mediaResponse.ok) return NextResponse.json({ error: "Meta n’a pas autorisé la lecture des publications." }, { status: 502 });
  const mediaBody = await mediaResponse.json() as { data?: InstagramMedia[] };
  const videos = (mediaBody.data ?? []).filter((item) => item.media_type === "VIDEO" || item.media_product_type === "REELS").slice(0, 10);

  const media = await Promise.all(videos.map(async (item) => {
    const values: Record<string, number> = {};
    const insightGroups = await Promise.all([
      readMediaInsights(base, item.id, accessToken, "views,reach,likes,comments"),
      readMediaInsights(base, item.id, accessToken, "saved,shares"),
    ]);
    for (const insight of insightGroups.flat()) {
      const value = insight.total_value?.value ?? insight.values?.at(-1)?.value;
      if (typeof value === "number") values[insight.name] = value;
    }
    return { id: item.id, caption: item.caption?.slice(0, 220) ?? "", permalink: item.permalink ?? "", timestamp: item.timestamp ?? null, metrics: values };
  }));

  return NextResponse.json({
    account: { username: profile.username ?? connection.username, accountType: profile.account_type ?? null, followers: profile.followers_count ?? null, mediaCount: profile.media_count ?? null, connectedAt: connection.connected_at },
    videos: media,
    metricsUpdatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
