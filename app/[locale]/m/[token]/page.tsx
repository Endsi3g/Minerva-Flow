import { getMenuShareByToken, getSiblingLocationsForPublicMenu } from "@/lib/data/menu-shares";
import { getActiveOffersForRestaurant } from "@/lib/data/offers";
import { getActiveReferralProgramForRestaurant } from "@/lib/data/referral-programs";
import { getCustomersForUser } from "@/lib/data/customer-portal";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MenuOrderFlow } from "./MenuOrderFlow";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { token } = await params;
  const { ref } = await searchParams;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`menu-share:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [landing, authResult] = await Promise.all([getMenuShareByToken(token), supabase.auth.getUser()]);
  if (!landing) notFound();
  const user = authResult.data.user;
  const [offers, shareProgram, siblingLocations, customers] = await Promise.all([
    getActiveOffersForRestaurant(landing.restaurantId),
    getActiveReferralProgramForRestaurant(landing.restaurantId),
    getSiblingLocationsForPublicMenu(landing.restaurantId),
    user ? getCustomersForUser(user.id) : Promise.resolve([]),
  ]);
  // Read-only lookup — does NOT create a customer row (that only happens
  // on order submission, see findOrCreateCustomerForUser) just because
  // someone with a magic-link session browsed the menu.
  const customer = customers.find((c) => c.restaurantId === landing.restaurantId) ?? null;

  return (
    <MenuOrderFlow
      token={token}
      referralCode={ref ?? null}
      landing={landing}
      offers={offers}
      authenticated={Boolean(user)}
      shareProgramId={shareProgram?.id ?? null}
      siblingLocations={siblingLocations}
      customerId={customer?.id ?? null}
      favoriteMenuItemIds={customer?.favoriteMenuItemIds ?? []}
      favoriteOfferIds={customer?.favoriteOfferIds ?? []}
    />
  );
}
