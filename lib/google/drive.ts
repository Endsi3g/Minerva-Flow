import { getGoogleTokens, updateGoogleConnectionMeta, getGoogleConnection } from "@/lib/data/google-connections";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FOLDER_NAME = "Minerva Flow";

/**
 * Returns the restaurant's dedicated Drive folder id, creating it on first
 * use and persisting the id on google_connections so it's only created once.
 */
export async function getOrCreateDriveFolder(restaurantId: string): Promise<string | null> {
  const existing = await getGoogleConnection(restaurantId);
  if (existing?.driveFolderId) return existing.driveFolderId;

  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return null;

  const res = await fetch(DRIVE_FILES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { id?: string };
  if (!data.id) return null;

  await updateGoogleConnectionMeta(restaurantId, { driveFolderId: data.id });
  return data.id;
}

/** Moves a Drive file into the restaurant's dedicated Minerva Flow folder. */
export async function moveFileToDriveFolder(
  restaurantId: string,
  fileId: string,
  folderId: string
): Promise<boolean> {
  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return false;

  const url = new URL(`${DRIVE_FILES_URL}/${fileId}`);
  url.searchParams.set("addParents", folderId);
  url.searchParams.set("removeParents", "root");
  url.searchParams.set("fields", "id, parents");

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  return res.ok;
}
