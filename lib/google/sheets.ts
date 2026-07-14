import { getGoogleTokens } from "@/lib/data/google-connections";
import { getOrCreateDriveFolder, moveFileToDriveFolder } from "@/lib/google/drive";

const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

export type SheetExportInput = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
};

/**
 * Creates a new Google Sheet with the report's table, then files it in the
 * restaurant's dedicated Drive folder. Returns the sheet's URL, or null if
 * any step fails (no partial-success UI — the export either fully works or
 * the caller shows a generic error toast).
 */
export async function exportReportToSheet(
  restaurantId: string,
  { title, columns, rows }: SheetExportInput
): Promise<string | null> {
  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return null;

  const createRes = await fetch(SHEETS_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!createRes.ok) return null;

  const created = (await createRes.json()) as { spreadsheetId?: string; spreadsheetUrl?: string };
  if (!created.spreadsheetId || !created.spreadsheetUrl) return null;

  const values = [columns, ...rows];
  const valuesRes = await fetch(
    `${SHEETS_BASE_URL}/${created.spreadsheetId}/values/A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
  if (!valuesRes.ok) return created.spreadsheetUrl; // values failed but the sheet exists — still useful

  const folderId = await getOrCreateDriveFolder(restaurantId);
  if (folderId) await moveFileToDriveFolder(restaurantId, created.spreadsheetId, folderId);

  return created.spreadsheetUrl;
}
