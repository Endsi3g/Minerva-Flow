import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";

export type LibraryAsset = {
  id: string;
  title: string;
  category: "facture" | "rapport" | "menu" | "procedure" | "autre";
  fileType: "pdf" | "doc" | "sheet" | "image";
  sizeFormatted: string;
  updatedAt: string;
  sourceName: string;
  description?: string;
  /** Internal app route holding the real record this entry summarizes — set for synthesized shortcuts, not real uploads. */
  url?: string;
  /** Real Supabase Storage path — set only for genuine user uploads (deletable, downloadable via a signed URL). */
  storagePath?: string;
};

/**
 * Curated shortcuts into a restaurant's real records elsewhere in the app
 * (purchase orders, menu, service days) — never a standalone file, since no
 * PDF/export is actually generated for these. Each carries a real `url` so
 * "open" always lands on the real underlying data instead of faking a
 * download of a document that doesn't exist.
 */
async function getSynthesizedShortcuts(restaurantId: string): Promise<LibraryAsset[]> {
  const supabase = await createClient();
  const assets: LibraryAsset[] = [];

  const { data: purchaseOrders } = await supabase
    .from("purchase_orders")
    .select("id, created_at, status, suppliers ( name )")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (purchaseOrders && purchaseOrders.length > 0) {
    const supplierNames = [
      ...new Set(purchaseOrders.map((po) => (po.suppliers as unknown as { name: string } | null)?.name).filter(Boolean)),
    ];
    assets.push({
      id: `po-index-${restaurantId}`,
      title: "Commandes fournisseurs récentes",
      category: "facture",
      fileType: "sheet",
      sizeFormatted: `${purchaseOrders.length} commande${purchaseOrders.length > 1 ? "s" : ""}`,
      updatedAt: new Date(purchaseOrders[0].created_at).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      sourceName: supplierNames.slice(0, 3).join(", ") || "Fournisseurs",
      description: `Vos ${purchaseOrders.length} dernières commandes fournisseurs, tous statuts confondus.`,
      url: "/fournisseurs",
    });
  }

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .eq("active", true);

  if (menuItems && menuItems.length > 0) {
    assets.push({
      id: `menu-index-${restaurantId}`,
      title: "Carte du menu actuelle",
      category: "menu",
      fileType: "doc",
      sizeFormatted: `${menuItems.length} plat${menuItems.length > 1 ? "s" : ""} actif${menuItems.length > 1 ? "s" : ""}`,
      updatedAt: "À jour",
      sourceName: "Menu",
      description: `Votre carte active — ${menuItems.length} plats en vente en ce moment.`,
      url: "/menu",
    });
  }

  const { data: serviceDays } = await supabase
    .from("service_days")
    .select("id, date, revenue")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false })
    .limit(5);

  if (serviceDays && serviceDays.length > 0) {
    assets.push({
      id: `report-index-${restaurantId}`,
      title: "Rapports de ventes",
      category: "rapport",
      fileType: "pdf",
      sizeFormatted: `${serviceDays.length} journée${serviceDays.length > 1 ? "s" : ""} récente${serviceDays.length > 1 ? "s" : ""}`,
      updatedAt: new Date(serviceDays[0].date).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      sourceName: "Finances",
      description: "Vos rapports de ventes et de performance, exportables en PDF depuis Rapports.",
      url: "/reports",
    });
  }

  return assets;
}

type LibraryAssetRow = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

function fileTypeFromMime(mimeType: string): LibraryAsset["fileType"] {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("sheet") || mimeType.includes("csv") || mimeType.includes("excel")) return "sheet";
  return "doc";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapUploadedAsset(row: LibraryAssetRow): LibraryAsset {
  return {
    id: row.id,
    title: row.file_name,
    category: "autre",
    fileType: fileTypeFromMime(row.mime_type),
    sizeFormatted: formatBytes(row.size_bytes),
    updatedAt: new Date(row.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" }),
    sourceName: "Téléversement direct",
    description: "Fichier ajouté à la bibliothèque de l'établissement.",
    storagePath: row.storage_path,
  };
}

export async function getRestaurantLibraryAssets(restaurantId: string): Promise<LibraryAsset[]> {
  const supabase = await createClient();

  const [shortcuts, { data: uploadedRows }] = await Promise.all([
    getSynthesizedShortcuts(restaurantId),
    supabase
      .from("library_assets")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
  ]);

  const uploaded = ((uploadedRows as LibraryAssetRow[] | null) ?? []).map(mapUploadedAsset);
  return [...uploaded, ...shortcuts];
}

export type LibraryAssetInput = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Registers a file already uploaded to the `library-assets` storage bucket
 * (the browser Supabase client does the actual upload — see
 * hooks/use-supabase-upload.ts) as a real, persisted library entry. Without
 * this row, the file sits in storage but is invisible/orphaned.
 */
export async function createLibraryAsset(restaurantId: string, input: LibraryAssetInput): Promise<LibraryAsset | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("library_assets")
    .insert({
      restaurant_id: restaurantId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      uploaded_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "library.upload",
    entityType: "library_asset",
    entityId: (data as LibraryAssetRow).id,
    description: `A ajouté "${input.fileName}" à la bibliothèque.`,
  });

  return mapUploadedAsset(data as LibraryAssetRow);
}

export async function getLibraryAssetDownloadUrl(restaurantId: string, assetId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("library_assets")
    .select("storage_path")
    .eq("restaurant_id", restaurantId)
    .eq("id", assetId)
    .maybeSingle();
  if (!row) return null;

  const { data, error } = await supabase.storage
    .from("library-assets")
    .createSignedUrl((row as { storage_path: string }).storage_path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteLibraryAsset(restaurantId: string, assetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("library_assets")
    .select("storage_path, file_name")
    .eq("restaurant_id", restaurantId)
    .eq("id", assetId)
    .maybeSingle();
  if (!row) return false;

  const { storage_path, file_name } = row as { storage_path: string; file_name: string };
  await supabase.storage.from("library-assets").remove([storage_path]);

  const { error } = await supabase.from("library_assets").delete().eq("restaurant_id", restaurantId).eq("id", assetId);
  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "library.delete",
    entityType: "library_asset",
    entityId: assetId,
    description: `A supprimé "${file_name}" de la bibliothèque.`,
  });

  return true;
}
