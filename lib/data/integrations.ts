import "server-only";

import { createClient } from "@/lib/supabase/server";

export type IntegrationItem = {
  id: string;
  name: string;
  category: "caisse" | "paiement" | "marketing" | "livraison" | "communication";
  description: string;
  status: "connected" | "disconnected" | "pending";
  connectedAt?: string;
  iconName: "square" | "stripe" | "google" | "delivery" | "resend";
  details?: Record<string, any>;
};

export async function getRestaurantIntegrations(restaurantId: string): Promise<IntegrationItem[]> {
  const supabase = await createClient();

  // 1. Fetch Restaurant Stripe Connect & Basic Status
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_connected_at")
    .eq("id", restaurantId)
    .maybeSingle();

  // 2. Fetch POS Connections (Square)
  const { data: posConn } = await supabase
    .from("pos_connections")
    .select("id, provider, location_id, updated_at")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

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
  const posConnected = Boolean(posConn?.id);
  const googleConnected = Boolean(googleConn?.id);
  const deliveryConnected = Boolean(deliveryConn?.id);
  const resendConnected = Boolean(process.env.RESEND_API_KEY);

  return [
    {
      id: "square-pos",
      name: "Square Point de Vente",
      category: "caisse",
      description: "Synchronisation automatique des ventes quotidiennes, inventaire et clôture de caisse.",
      status: posConnected ? "connected" : "disconnected",
      connectedAt: posConn?.updated_at ? new Date(posConn.updated_at).toLocaleDateString("fr-CA") : undefined,
      iconName: "square",
      details: {
        locationId: posConn?.location_id || "Non configuré",
        provider: "Square POS API v2",
        autoSync: true,
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
