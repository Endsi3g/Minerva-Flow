import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPosConnections, type PosProvider } from "@/lib/data/pos-connections";
import { isSquareConfigured, isLightspeedConfigured, isQuickBooksConfigured } from "@/lib/pos/config";
import { formatDate } from "@/lib/utils";

export type IntegrationItem = {
  id: string;
  name: string;
  category: "caisse" | "paiement" | "comptabilite" | "marketing" | "livraison" | "communication";
  description: string;
  status: "connected" | "disconnected" | "pending" | "error" | "coming_soon" | "on_request";
  connectedAt?: string;
  iconName:
    | "square"
    | "lightspeed"
    | "stripe"
    | "google"
    | "google-maps"
    | "google-workspace"
    | "google-analytics"
    | "google-pay"
    | "delivery"
    | "resend"
    | "quickbooks"
    | "xero"
    | "sage"
    | "freshbooks"
    | "dext"
    | "pennylane"
    | "clover"
    | "moneris"
    | "paypal"
    | "apple-pay"
    | "instagram";
  details?: Record<string, any>;
};

const posProviderMeta: Record<PosProvider, { name: string; description: string; iconName: IntegrationItem["iconName"] }> = {
  square: {
    name: "Square Point de Vente",
    description: "Synchronisation automatique des ventes quotidiennes et clôtures de caisse.",
    iconName: "square",
  },
  lightspeed: {
    name: "Lightspeed Restaurant",
    description: "Synchronisation automatique des ventes quotidiennes (K-Series / L-Series).",
    iconName: "lightspeed",
  },
  clover: {
    name: "Clover POS",
    description: "Synchronisation des terminaux de caisse et tickets de vente.",
    iconName: "clover",
  },
  quickbooks: {
    name: "QuickBooks Online",
    description: "Synchronisation de vos dépenses et écritures comptables.",
    iconName: "quickbooks",
  },
};

export async function getRestaurantIntegrations(restaurantId: string): Promise<IntegrationItem[]> {
  const supabase = await createClient();

  // 1. Fetch Restaurant Stripe Connect & Basic Status
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_connected_at")
    .eq("id", restaurantId)
    .maybeSingle();

  // 2. Fetch POS Connections — multi-row aware (a restaurant can have both
  // Square and Lightspeed connected at once), reusing the same real
  // connection model as the Settings page instead of a stale, single-row
  // query that assumed exactly one POS.
  const posConnections = await getPosConnections(restaurantId);
  const posConfigured: Record<PosProvider, boolean> = {
    square: isSquareConfigured(),
    lightspeed: isLightspeedConfigured(),
    clover: false,
    quickbooks: isQuickBooksConfigured(),
  };

  // 3. Fetch Google Connections
  const { data: googleConn } = await supabase
    .from("google_connections")
    .select("id, place_id, updated_at")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // 4. Fetch Delivery Connections
  const { data: deliveryConn } = await supabase
    .from("reservation_delivery_connections")
    .select("id, platform, status, updated_at")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // 5. Fetch Instagram Connection
  const { data: instagramConn } = await supabase
    .from("ad_platform_connections")
    .select("id, status, external_account_id, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("provider", "instagram")
    .maybeSingle();

  const stripeConnected = Boolean(restaurant?.stripe_connect_account_id && restaurant?.stripe_connect_charges_enabled);
  const googleConnected = Boolean(googleConn?.id);
  const deliveryConnected = Boolean(deliveryConn?.id);
  const instagramConnected = Boolean(instagramConn?.id && instagramConn?.status === "connecte");
  const resendConnected = Boolean(process.env.RESEND_API_KEY);

  // One card per POS provider that's either configured (env vars present)
  // or already has a connection row — so a provider nobody's set up yet
  // simply doesn't clutter the list, but an existing connection always
  // shows even if the env got unconfigured later.
  const posItems: IntegrationItem[] = (["square", "lightspeed"] as PosProvider[])
    .filter((provider) => posConfigured[provider] || posConnections.some((c) => c.provider === provider))
    .map((provider) => {
      const connection = posConnections.find((c) => c.provider === provider);
      const meta = posProviderMeta[provider];
      const status: IntegrationItem["status"] = !connection
        ? "disconnected"
        : connection.status === "erreur"
          ? "error"
          : connection.status === "attente"
            ? "pending"
            : "connected";

      return {
        id: `${provider}-pos`,
        name: meta.name,
        category: "caisse",
        description: meta.description,
        status,
        connectedAt: connection?.lastSyncedAt ? formatDate(connection.lastSyncedAt) : undefined,
        iconName: meta.iconName,
        details: {
          externalAccountId: connection?.externalAccountId || "Non configuré",
          autoSync: status === "connected",
        },
      };
    });

  return [
    ...posItems,
    {
      id: "clover-pos",
      name: "Clover POS",
      category: "caisse",
      description: "Synchronisation des terminaux de caisse Clover et tickets de vente en salle.",
      status: "coming_soon",
      iconName: "clover",
      details: {
        disponibilite: "Prochaine mise à jour",
        mode: "API Directe Cloud",
      },
    },
    {
      id: "stripe-connect",
      name: "Stripe Connect Paiements",
      category: "paiement",
      description: "Encaissement des commandes en ligne, acompte de réservation et transferts bancaires automatisés.",
      status: stripeConnected ? "connected" : "disconnected",
      connectedAt: restaurant?.stripe_connect_connected_at
        ? new Date(restaurant.stripe_connect_connected_at).toLocaleDateString("fr-CA")
        : undefined,
      iconName: "stripe",
      details: {
        accountId: restaurant?.stripe_connect_account_id || "Aucun compte connecté",
        chargesEnabled: restaurant?.stripe_connect_charges_enabled || false,
      },
    },
    {
      id: "apple-pay",
      name: "Apple Pay & Sans Contact",
      category: "paiement",
      description: "Encaissement instantané sur smartphone, commande à table QR et Apple Wallet.",
      status: "connected",
      connectedAt: "Actif via Stripe",
      iconName: "apple-pay",
      details: {
        securite: "Biométrie FaceID / TouchID",
        protocole: "NFC & Web Checkout",
      },
    },
    {
      id: "google-pay",
      name: "Google Pay",
      category: "paiement",
      description: "Règlement sécurisé en un clic sur Android, navigateur Chrome et terminaux compatibles.",
      status: "connected",
      connectedAt: "Actif via Stripe",
      iconName: "google-pay",
      details: {
        securite: "Tokenisation bancaire Google",
        protocole: "NFC & Web Checkout",
      },
    },
    {
      id: "moneris-pay",
      name: "Moneris Solutions de Paiement",
      category: "paiement",
      description: "Terminaux de paiement physiques et passerelle d'encaissement de référence au Canada.",
      status: "on_request",
      iconName: "moneris",
      details: {
        disponibilite: "Sur demande personnalisée",
        compatibilite: "Terminaux Débit Interac & Crédit",
      },
    },
    {
      id: "paypal-pay",
      name: "PayPal Restauration",
      category: "paiement",
      description: "Paiements en ligne, acomptes traiteur et option de règlement en 4 fois pour vos clients.",
      status: "coming_soon",
      iconName: "paypal",
      details: {
        disponibilite: "Bientôt disponible",
        mode: "Passerelle Commerce",
      },
    },
    {
      id: "quickbooks-online",
      name: "QuickBooks Online",
      category: "comptabilite",
      description: "Synchronisation automatique des ventes, TVA/TVQ et écritures comptables quotidiennes.",
      status: posConfigured.quickbooks ? "connected" : "coming_soon",
      iconName: "quickbooks",
      details: {
        module: "Rapprochement bancaire & Z de caisse",
        statut: posConfigured.quickbooks ? "Configuré" : "Bientôt disponible",
      },
    },
    {
      id: "xero-accounting",
      name: "Xero Restauration",
      category: "comptabilite",
      description: "Ventilation automatique du grand livre comptable et suivi de trésorerie multi-devises.",
      status: "coming_soon",
      iconName: "xero",
      details: {
        disponibilite: "Bientôt disponible",
        compatibilite: "Xero Cloud Accounting",
      },
    },
    {
      id: "sage-accounting",
      name: "Sage Business Cloud",
      category: "comptabilite",
      description: "Export des écritures comptables certifiées conformes pour experts-comptables et vérificateurs.",
      status: "on_request",
      iconName: "sage",
      details: {
        disponibilite: "Sur demande d'intégration",
        format: "FEC & Journal des ventes",
      },
    },
    {
      id: "pennylane-accounting",
      name: "Pennylane",
      category: "comptabilite",
      description: "Centralisation des factures fournisseurs, gestion des marges et pilotage de la trésorerie.",
      status: "coming_soon",
      iconName: "pennylane",
      details: {
        disponibilite: "Bientôt disponible",
        module: "Pilotage Restauration",
      },
    },
    {
      id: "freshbooks-accounting",
      name: "FreshBooks",
      category: "comptabilite",
      description: "Facturation simplifiée, notes de frais et suivi des règlements pour la restauration.",
      status: "coming_soon",
      iconName: "freshbooks",
      details: {
        disponibilite: "Bientôt disponible",
        module: "Facturation & Dépenses",
      },
    },
    {
      id: "dext-accounting",
      name: "Dext (Receipt Bank)",
      category: "comptabilite",
      description: "Numérisation et extraction automatique par IA de vos factures d'achats et reçus fournisseurs.",
      status: "coming_soon",
      iconName: "dext",
      details: {
        disponibilite: "Bientôt disponible",
        module: "Numérisation Reçus & Factures",
      },
    },
    {
      id: "google-business",
      name: "Google Business Profile & Avis",
      category: "marketing",
      description: "Importation des avis clients, synchronisation de la fiche établissement et analyse de réputation par IA.",
      status: googleConnected ? "connected" : "disconnected",
      connectedAt: googleConn?.updated_at ? new Date(googleConn.updated_at).toLocaleDateString("fr-CA") : undefined,
      iconName: "google-maps",
      details: {
        placeId: googleConn?.place_id || "Non connecté",
        avisSynchronises: googleConnected ? "Oui" : "En attente",
      },
    },
    {
      id: "google-workspace",
      name: "Google Workspace & Agenda",
      category: "marketing",
      description: "Synchronisation de l'agenda des réservations de groupes, plannings d'équipe et alertes Gmail.",
      status: googleConnected ? "connected" : "disconnected",
      connectedAt: googleConnected ? "Connecté" : undefined,
      iconName: "google-workspace",
      details: {
        modules: "Gmail, Calendar, Drive, Sheets",
      },
    },
    {
      id: "google-analytics",
      name: "Google Analytics 4 (GA4)",
      category: "marketing",
      description: "Suivi des visites sur le menu digital, sources de trafic et taux de conversion des commandes.",
      status: googleConnected ? "connected" : "disconnected",
      connectedAt: googleConnected ? "Connecté" : undefined,
      iconName: "google-analytics",
      details: {
        mesure: "Trafic menu public & QR codes",
      },
    },
    {
      id: "instagram-business",
      name: "Instagram Professionnel",
      category: "marketing",
      description: "Publication directe des visuels Marketing Studio, modération des commentaires et synchronisation des interactions.",
      status: instagramConnected ? "connected" : "disconnected",
      connectedAt: instagramConn?.created_at ? new Date(instagramConn.created_at).toLocaleDateString("fr-CA") : undefined,
      iconName: "instagram",
      details: {
        compteId: instagramConn?.external_account_id || "Non connecté",
        authentification: "Business Login for Instagram (Direct)",
      },
    },
    {
      id: "ubereats-delivery",
      name: "Plateformes de Livraison & Commandes",
      category: "livraison",
      description: "Agrégation des commandes UberEats, DoorDash, SkipTheDishes et OpenTable dans un flux unique.",
      status: deliveryConnected ? "connected" : "disconnected",
      connectedAt: deliveryConn?.updated_at ? new Date(deliveryConn.updated_at).toLocaleDateString("fr-CA") : undefined,
      iconName: "delivery",
      details: {
        platform: deliveryConn?.platform || "DoorDash / UberEats",
      },
    },
    {
      id: "site-sync",
      name: "Site Web Vitrine ↔ Dashboard",
      category: "marketing",
      description: "Publication en direct du menu du jour, des horaires d'ouverture et des bannières d'annonces promos sur le site web public.",
      status: "connected",
      connectedAt: "Synchro Active",
      iconName: "google",
      details: {
        channel: "Direct Webhook & Stream Sync",
        mode: "Automatique",
      },
    },
    {
      id: "resend-email",
      name: "Resend Services Courriel",
      category: "communication",
      description: "Envoi des invitations d'équipe, notifications de paie, récapitulatifs quotidiens et campagnes.",
      status: resendConnected ? "connected" : "pending",
      connectedAt: "Actif",
      iconName: "resend",
      details: {
        sandboxDomain: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      },
    },
  ];
}
