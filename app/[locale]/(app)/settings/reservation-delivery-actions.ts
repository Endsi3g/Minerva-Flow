"use server";

import { revalidatePath } from "next/cache";
import {
  getReservationDeliveryConnections,
  saveReservationDeliveryCredentials,
  removeReservationDeliveryConnection,
  type ReservationDeliveryConnection,
  type ReservationDeliveryProvider,
  type ReservationDeliveryCategory,
} from "@/lib/data/reservation-delivery-connections";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";

export async function getReservationDeliveryConnectionsAction(
  restaurantId: string
): Promise<ReservationDeliveryConnection[]> {
  if (!restaurantId) return [];
  return getReservationDeliveryConnections(restaurantId);
}

export async function saveReservationDeliveryCredentialsAction(
  provider: ReservationDeliveryProvider,
  category: ReservationDeliveryCategory,
  input: { externalAccountId: string; apiKey: string }
): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) return false;
  if (!input.externalAccountId.trim() || !input.apiKey.trim()) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await saveReservationDeliveryCredentials(
    membership.restaurantId,
    provider,
    category,
    input,
    user?.id ?? null
  );

  revalidatePath("/settings");
  return true;
}

export async function removeReservationDeliveryConnectionAction(
  provider: ReservationDeliveryProvider
): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) return false;

  await removeReservationDeliveryConnection(membership.restaurantId, provider);
  revalidatePath("/settings");
  return true;
}
