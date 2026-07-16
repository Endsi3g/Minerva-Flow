import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Reservation, ReservationStatus, RestaurantTable } from "@/lib/types";

type TableRow = {
  id: string;
  restaurant_id: string;
  label: string;
  capacity: number;
  created_at: string;
};

function mapTable(row: TableRow): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    label: row.label,
    capacity: row.capacity,
    createdAt: row.created_at,
  };
}

export async function getTables(restaurantId: string): Promise<RestaurantTable[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("label");

  if (error || !data) return [];
  return (data as TableRow[]).map(mapTable);
}

export async function createTable(
  restaurantId: string,
  input: { label: string; capacity: number }
): Promise<RestaurantTable | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({ restaurant_id: restaurantId, label: input.label, capacity: input.capacity })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapTable(data as TableRow);
}

export async function deleteTable(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

type ReservationRow = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  guest_name: string;
  guest_phone: string | null;
  party_size: number;
  reservation_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  referral_link_id: string | null;
  is_public_request: boolean;
};

function mapReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    partySize: row.party_size,
    reservationTime: row.reservation_time,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    customerId: row.customer_id,
    referralLinkId: row.referral_link_id,
    isPublicRequest: row.is_public_request,
  };
}

/** Reservations for one calendar day (local to the restaurant's day boundaries as passed in). */
export async function getReservationsForDay(
  restaurantId: string,
  dayStart: string,
  dayEnd: string
): Promise<Reservation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("reservation_time", dayStart)
    .lt("reservation_time", dayEnd)
    .order("reservation_time");

  if (error || !data) return [];
  return (data as ReservationRow[]).map(mapReservation);
}

export async function getReservation(restaurantId: string, id: string): Promise<Reservation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapReservation(data as ReservationRow);
}

export type ReservationInput = {
  tableId: string | null;
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  reservationTime: string;
  notes: string | null;
};

export async function createReservation(
  restaurantId: string,
  input: ReservationInput
): Promise<Reservation | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurantId,
      table_id: input.tableId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      party_size: input.partySize,
      reservation_time: input.reservationTime,
      notes: input.notes,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "reservation.create",
    description: `A ajouté une réservation pour ${input.guestName} (${input.partySize} pers.)`,
  });

  return mapReservation(data as ReservationRow);
}

export async function updateReservationStatus(
  restaurantId: string,
  id: string,
  status: ReservationStatus
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function updateReservationTable(
  restaurantId: string,
  id: string,
  tableId: string | null
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ table_id: tableId })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function deleteReservation(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}
