import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerJoinPage({ searchParams }: { searchParams: Promise<{ restaurant?: string }> }) {
  const { restaurant } = await searchParams;
  if (!restaurant || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(restaurant)) redirect("/portal/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/customer-join?restaurant=${restaurant}`)}`);
  const { error } = await supabase.rpc("join_restaurant_as_customer", { p_restaurant_id: restaurant });
  if (error) redirect("/portal/login?join=retry");
  redirect("/portal");
}
