import "server-only";
import { getAdPlatformConnections, getAdPlatformTokens } from "@/lib/data/ad-platforms";

const GRAPH_VERSION = "v21.0";

export type InstagramPublishResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: string };

/**
 * Real Instagram Content Publishing API flow (Graph API, not a stub):
 * 1. Create a media container on the IG business account (the image +
 *    caption, held server-side by Meta but not yet visible on the profile).
 * 2. Publish that container, which is what actually makes it appear.
 * This two-call shape is how Meta's API works for every image publish —
 * there's no single-call "post this" endpoint.
 *
 * Requires the restaurant to have both an "instagram" connection (see
 * app/api/oauth/instagram) AND that connection to have resolved a linked
 * Instagram professional account id at connect time — the caller should
 * check getInstagramConnectionStatus() first and surface "link a Page in
 * Meta Business Suite" if instagramBusinessAccountId is null, rather than
 * calling this blind.
 */
export async function publishToInstagram(
  restaurantId: string,
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  const [tokens, connections] = await Promise.all([
    getAdPlatformTokens(restaurantId, "instagram"),
    getAdPlatformConnections(restaurantId),
  ]);

  if (!tokens) {
    return { ok: false, error: "Instagram n'est pas connecté pour cet établissement." };
  }

  const instagramBusinessAccountId = connections.find((c) => c.provider === "instagram")?.externalAccountId;
  if (!instagramBusinessAccountId) {
    return {
      ok: false,
      error:
        "Aucun compte Instagram professionnel lié à la Page Facebook connectée. Liez-en un depuis Meta Business Suite, puis reconnectez.",
    };
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${instagramBusinessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: tokens.accessToken,
      }),
    }
  );
  const containerData = (await containerRes.json()) as { id?: string; error?: { message: string } };
  if (!containerRes.ok || !containerData.id) {
    return { ok: false, error: containerData.error?.message ?? "Échec de la création du média Instagram." };
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${instagramBusinessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: tokens.accessToken,
      }),
    }
  );
  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };
  if (!publishRes.ok || !publishData.id) {
    return { ok: false, error: publishData.error?.message ?? "Échec de la publication Instagram." };
  }

  return { ok: true, mediaId: publishData.id };
}

export type InstagramConnectionStatus = {
  connected: boolean;
  instagramBusinessAccountId: string | null;
};

export async function getInstagramConnectionStatus(restaurantId: string): Promise<InstagramConnectionStatus> {
  const connections = await getAdPlatformConnections(restaurantId);
  const connection = connections.find((c) => c.provider === "instagram");
  return {
    connected: connection?.status === "connecte",
    instagramBusinessAccountId: connection?.externalAccountId ?? null,
  };
}
