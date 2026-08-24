import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPosConnections, type PosProvider } from "@/lib/data/pos-connections";
import { isSquareConfigured, isLightspeedConfigured } from "@/lib/pos/config";
import { formatDate } from "@/lib/utils";

export type IntegrationItem = {
  id: string;
  name: string;
  category: "caisse" | "paiement" | "marketing" | "livraison" | "communication";
  description: string;
  status: "connected" | "disconnected" | "pending" | "error";
  connectedAt?: string;
  iconName: "square" | "lightspeed" | "stripe" | "google" | "delivery" | "resend";
  details?: Record<string, any>;
};

const posProviderMeta: Record<PosProvider, { name: string; description: string; iconName: IntegrationItem["iconName"] }> = {
  square: {
    name: "Square Point de Vente",
    description: "Synchronisation automatique des ventes quotidiennes.",
    iconName: "square",
  },
  lightspeed: {
    name: "Lightspeed Restaurant",
    description: "Synchronisation automatique des ventes quotidiennes (K-Series).",
    iconName: "lightspeed",
  },
  clover: {
    name: "Clover",
    description: "Pas encore disponible.",
    iconName: "square",
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

  const stripeConnected = Boolean(restaurant?.stripe_connect_account_id && restaurant?.stripe_connect_charges_enabled);
  const googleConnected = Boolean(googleConn?.id);
  const deliveryConnected = Boolean(deliveryConn?.id);
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
      id: "google-business",
      name: "Google Business & Avis",
      category: "marketing",
      description: "Importation des avis clients, synchronisation de la fiche établissement et analyse de réputation par IA.",
      status: googleConnected ? "connected" : "disconnected",
      connectedAt: googleConn?.updated_at ? new Date(googleConn.updated_at).toLocaleDateString("fr-CA") : undefined,
      iconName: "google",
      details: {
        placeId: googleConn?.place_id || "Non connecté",
      },
    },
    {
      id: "ubereats-delivery",
      name: "Plateformes de Livraison & Réservations",
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
