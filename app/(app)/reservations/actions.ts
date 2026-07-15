"use server";

import { revalidatePath } from "next/cache";
import {
  getTables,
  createTable,
  deleteTable,
  getReservationsForDay,
  createReservation,
  updateReservationStatus,
  updateReservationTable,
  deleteReservation,
  type ReservationInput,
} from "@/lib/data/reservations";
import { notifyRestaurant } from "@/lib/data/notifications";
import type { Reservation, ReservationStatus, RestaurantTable } from "@/lib/types";

export async function getTablesAction(restaurantId: string): Promise<RestaurantTable[]> {
  if (!restaurantId) return [];
  return getTables(restaurantId);
}

export async function createTableAction(
  restaurantId: string,
  input: { label: string; capacity: number }
): Promise<RestaurantTable | null> {
  if (!input.label.trim()) return null;
  const table = await createTable(restaurantId, input);
  if (table) revalidatePath("/reservations");
  return table;
}

export async function deleteTableAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteTable(restaurantId, id);
  if (ok) revalidatePath("/reservations");
  return ok;
}

export async function getReservationsForDayAction(
  restaurantId: string,
  dayStart: string,
  dayEnd: string
): Promise<Reservation[]> {
  if (!restaurantId) return [];
  return getReservationsForDay(restaurantId, dayStart, dayEnd);
}

export async function createReservationAction(
  restaurantId: string,
  input: ReservationInput
): Promise<Reservation | null> {
  if (!input.guestName.trim()) return null;
  const reservation = await createReservation(restaurantId, input);
  if (reservation) {
    revalidatePath("/reservations");
    await notifyRestaurant({
      restaurantId,
      type: "reservation.created",
      title: "Nouvelle réservation",
      body: `${input.guestName} — ${input.partySize} pers.`,
      link: "/reservations",
    });
  }
  return reservation;
}

export async function updateReservationStatusAction(
  restaurantId: string,
  id: string,
  status: ReservationStatus
): Promise<boolean> {
  const ok = await updateReservationStatus(restaurantId, id, status);
  if (ok) revalidatePath("/reservations");
  return ok;
}

export async function updateReservationTableAction(
  restaurantId: string,
  id: string,
  tableId: string | null
): Promise<boolean> {
  const ok = await updateReservationTable(restaurantId, id, tableId);
  if (ok) revalidatePath("/reservations");
  return ok;
}

export async function deleteReservationAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteReservation(restaurantId, id);
  if (ok) revalidatePath("/reservations");
  return ok;
}
