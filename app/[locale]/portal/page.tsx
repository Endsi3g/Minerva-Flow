import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomersForUser, getPortalData } from "@/lib/data/customer-portal";
import { getRestaurant } from "@/lib/data/restaurants";
import { getActiveMenuItemsForCustomers } from "@/lib/data/menu";
import { getActiveOffersForCustomers } from "@/lib/data/offers";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config";
import { LogoMark } from "@/components/shell/Logo";
import { PortalView } from "./PortalView";
import { NoCustomerFoundActions } from "./NoCustomerFound";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer: customerIdParam } = await searchParams;
  const t = await getTranslations("portal.page");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/portal/login", locale: await getLocale() });

  const customers = await getCustomersForUser(user.id);
  if (customers.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <div>
          <p className="font-display text-[19px] font-medium text-mv-ink">{t("noCustomerTitle")}</p>
          <p className="mt-1.5 max-w-sm text-[13px] text-mv-ink-soft">
            {t("noCustomerDescription")}
          </p>
          <NoCustomerFoundActions />
        </div>
      </div>
    );
  }

  const selected =
    customers.length === 1
      ? customers[0]
      : customerIdParam
        ? customers.find((c) => c.id === customerIdParam)
        : undefined;

  if (!selected) {
    // Same email is a loyalty customer at more than one restaurant on the
    // platform — never guess which one, ask.
    const restaurants = await Promise.all(customers.map((c) => getRestaurant(c.restaurantId)));

    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-sans text-[16px] font-medium text-mv-ink">
              Minerva <span className="text-mv-green-dark">Flow</span>
            </span>
          </div>
          <p className="mb-3 text-center text-[13px] text-mv-ink-soft">{t("chooseEstablishment")}</p>
          <div className="space-y-2">
            {customers.map((c, i) => (
              <Link
                key={c.id}
                href={`/portal?customer=${c.id}`}
                className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-surface px-4 py-3 shadow-mv-sm transition-colors hover:bg-mv-cream-soft"
              >
                <span className="text-[13.5px] font-medium text-mv-ink">
                  {restaurants[i]?.name ?? t("establishmentFallback")}
                </span>
                <ChevronRight size={15} className="text-mv-ink-faint" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [data, restaurant, menuItems, offers] = await Promise.all([
    getPortalData(selected),
    getRestaurant(selected.restaurantId),
    getActiveMenuItemsForCustomers(selected.restaurantId),
    getActiveOffersForCustomers(selected.restaurantId),
  ]);
  const loyaltyTierThresholds = {
    tier2: restaurant?.loyaltyTier2Threshold ?? 150,
    tier3: restaurant?.loyaltyTier3Threshold ?? 400,
  };
  return (
    <PortalView
      customer={selected}
      data={data}
      loyaltyTierThresholds={loyaltyTierThresholds}
      menuItems={menuItems}
      offers={offers}
      taxRate={restaurant?.taxRate ?? 0.14975}
      acceptsTips={restaurant?.acceptsTips ?? false}
      restaurantName={restaurant?.name ?? null}
      appleWalletEnabled={isAppleWalletConfigured()}
      googleWalletEnabled={isGoogleWalletConfigured()}
    />
  );
}
