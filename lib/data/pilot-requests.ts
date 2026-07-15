import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PilotRequest = {
  id: string;
  fullName: string;
  email: string;
  restaurantName: string;
  city: string | null;
  phone: string | null;
  message: string | null;
  status: "nouveau" | "contacte" | "actif" | "decline";
  createdAt: string;
};

type PilotRequestRow = {
  id: string;
  full_name: string;
  email: string;
  restaurant_name: string;
  city: string | null;
  phone: string | null;
  message: string | null;
  status: "nouveau" | "contacte" | "actif" | "decline";
  created_at: string;
};

function mapPilotRequest(row: PilotRequestRow): PilotRequest {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    restaurantName: row.restaurant_name,
    city: row.city,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export type CreatePilotRequestInput = {
  fullName: string;
  email: string;
  restaurantName: string;
  city?: string;
  phone?: string;
  message?: string;
};

/** Public form submitter has no session — always goes through the admin client, same as invites/report_shares. */
export async function createPilotRequest(input: CreatePilotRequestInput): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("pilot_requests").insert({
    full_name: input.fullName,
    email: input.email,
    restaurant_name: input.restaurantName,
    city: input.city || null,
    phone: input.phone || null,
    message: input.message || null,
  });
  return !error;
}

export async function getPilotRequests(): Promise<PilotRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pilot_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as PilotRequestRow[]).map(mapPilotRequest);
}

export async function updatePilotRequestStatus(
  id: string,
  status: PilotRequest["status"]
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("pilot_requests").update({ status }).eq("id", id);
  return !error;
}
