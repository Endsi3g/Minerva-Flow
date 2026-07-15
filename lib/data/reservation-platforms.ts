import { createClient } from "@/lib/supabase/server";

export type ReservationPlatform = "opentable" | "resy" | "sevenrooms";
export type ReservationPlatformConnection = {
  platform: ReservationPlatform;
  status: "connecte" | "erreur" | "attente";
};

export async function getReservationPlatformConnections(
  restaurantId: string
): Promise<ReservationPlatformConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservation_platform_connections")
    .select("platform, status")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];
  return data as ReservationPlatformConnection[];
}
