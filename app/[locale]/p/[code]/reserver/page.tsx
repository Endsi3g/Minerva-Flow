import { createClient } from "@/lib/supabase/server";
import { getReferralLandingByCode } from "@/lib/data/customer-referrals";
import { notFound } from "next/navigation";
import { ReservationRequestFlow } from "./ReservationRequestFlow";

export default async function ReferralReservationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const landing = await getReferralLandingByCode(code);
  if (!landing) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ReservationRequestFlow code={code} restaurantName={landing.restaurantName} authenticated={Boolean(user)} />
  );
}
