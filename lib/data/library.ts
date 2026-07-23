import "server-only";

import { createClient } from "@/lib/supabase/server";

export type LibraryAsset = {
  id: string;
  title: string;
  category: "facture" | "rapport" | "menu" | "procedure" | "autre";
  fileType: "pdf" | "doc" | "sheet" | "image";
  sizeFormatted: string;
  updatedAt: string;
  sourceName: string;
  url?: string;
  description?: string;
};

export async function getRestaurantLibraryAssets(restaurantId: string): Promise<LibraryAsset[]> {
  const supabase = await createClient();

  const assets: LibraryAsset[] = [];

  // 1. Fetch Purchase Orders (Fournisseurs / Factures)
  const { data: purchaseOrders } = await supabase
    .from("purchase_orders")
    .select("id, created_at, total_amount, status, suppliers ( name )")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (purchaseOrders) {
    purchaseOrders.forEach((po) => {
      const supplierName = (po.suppliers as any)?.name || "Fournisseur";
      assets.push({
        id: `po-${po.id}`,
        title: `Facture_${supplierName.replace(/\s+/g, "_")}_${new Date(po.created_at).toISOString().slice(0, 10)}.pdf`,
        category: "facture",
        fileType: "pdf",
        sizeFormatted: "245 KB",
        updatedAt: new Date(po.created_at).toLocaleDateString("fr-CA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        sourceName: supplierName,
        description: `Commande ${po.status} d'un montant de ${Number(po.total_amount || 0).toFixed(2)} $`,
      });
    });
  }

  // 2. Fetch Menu Items (Carte & Ingénierie)
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, category, updated_at, selling_price")
    .eq("restaurant_id", restaurantId)
    .limit(5);

  if (menuItems && menuItems.length > 0) {
    assets.push({
      id: `menu-export-${restaurantId}`,
      title: `Carte_Menu_Officielle_2026.pdf`,
      category: "menu",
      fileType: "pdf",
      sizeFormatted: "1.2 MB",
      updatedAt: "Récemment",
      sourceName: "Ingénierie du Menu",
      description: `Export de la carte complète incluant ${menuItems.length} plats référencés.`,
    });
  }

  // 3. Fetch Service Days / Reports (Rapports de revenus)
  const { data: serviceDays } = await supabase
    .from("service_days")
    .select("id, date, total_revenue")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false })
    .limit(5);

  if (serviceDays && serviceDays.length > 0) {
    assets.push({
      id: `report-sales-summary`,
      title: `Synthèse_Hebdomadaire_Ventes.pdf`,
      category: "rapport",
      fileType: "pdf",
      sizeFormatted: "410 KB",
      updatedAt: new Date(serviceDays[0].date).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      sourceName: "Finances & POS",
      description: `Rapport consolidé des ventes hebdomadaires et des transactions de caisse.`,
    });
  }

  // 4. Default Standard Operating Procedures for Restaurant Ops
  assets.push(
    {
      id: "sop-hygiene-quebec",
      title: "Guide_Hygiene_Et_Salubrite_MAPAQ.pdf",
      category: "procedure",
      fileType: "pdf",
      sizeFormatted: "850 KB",
      updatedAt: "12 Janv. 2026",
      sourceName: "Normes MAPAQ",
      description: "Manuel de procédures d'hygiène réglementaires et contrôle des températures.",
    },
    {
      id: "sop-onboarding-equipe",
      title: "Manuel_Accueil_Nouveaux_Employes.doc",
      category: "procedure",
      fileType: "doc",
      sizeFormatted: "180 KB",
      updatedAt: "04 Fév. 2026",
      sourceName: "Ressources Humaines",
      description: "Procédure d'arrivée de l'équipe, horaires, pointage et politiques de service.",
    }
  );

  return assets;
}
