import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import type { Supplier } from "@/lib/types";

type SupplierRow = {
  id: string;
  restaurant_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  address: string | null;
  lng: number | null;
  lat: number | null;
  created_at: string;
};

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    category: row.category,
    address: row.address,
    lng: row.lng,
    lat: row.lat,
    createdAt: row.created_at,
  };
}

export async function getSuppliers(restaurantId: string): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");

  if (error || !data) return [];
  return (data as SupplierRow[]).map(mapSupplier);
}

export type SupplierInput = {
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  address?: string | null;
};

export async function createSupplier(restaurantId: string, input: SupplierInput): Promise<Supplier | null> {
  const supabase = await createClient();

  const coords = input.address ? await geocodeAddress(input.address, "", "Québec") : null;

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      contact_name: input.contactName,
      phone: input.phone,
      email: input.email,
      category: input.category,
      address: input.address ?? null,
      lng: coords?.lng ?? null,
      lat: coords?.lat ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapSupplier(data as SupplierRow);
}

export async function deleteSupplier(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}
