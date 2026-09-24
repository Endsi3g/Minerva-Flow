import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomersForUser, getPortalData } from "@/lib/data/customer-portal";
import { getRestaurant } from "@/lib/data/restaurants";
import { getActiveMenuItemsForCustomers } from "@/lib/data/menu";
import { getActiveOffersForCustomers } from "@/lib/data/offers";
import { getActiveAnnouncements } from "@/lib/data/announcements";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config";
import { LogoMark } from "@/components/shell/Logo";
import { recordMenuView } from "@/lib/data/menu-views";
import { PortalView, type PortalCheckoutReturn } from "./PortalView";
import { NoCustomerFoundActions } from "./NoCustomerFound";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { getPublicCheckoutOptions } from "@/lib/orders/checkout-options";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string | string[]; payment?: string | string[]; order?: string | string[] }>;
}) {
  const query = await searchParams;
  const customerIdParam = Array.isArray(query.customer) ? query.customer[0] : query.customer;
  const paymentParam = Array.isArray(query.payment) ? query.payment[0] : query.payment;
  const orderParam = Array.isArray(query.order) ? query.order[0] : query.order;
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

  // Stripe redirects with an opaque order id, never trusted on its own.
  // Resolve it only within customer rows already proven to belong to this
  // authenticated user, so a forged query cannot reveal another order.
  let checkoutReturn: PortalCheckoutReturn | null = null;
  let checkoutReturnCustomerId: string | null = null;
  if ((paymentParam === "return" || paymentParam === "cancelled")
      && orderParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderParam)) {
    const eligibleCustomerIds = customers
      .filter((customer) => !customerIdParam || customer.id === customerIdParam)
      .map((customer) => customer.id);
    if (eligibleCustomerIds.length > 0) {
      const { data: order } = await createAdminClient().from("orders")
        .select("id, customer_id, payment_status, total, estimated_ready_at")
        .eq("id", orderParam)
        .in("customer_id", eligibleCustomerIds)
        .maybeSingle();
      if (order) {
        checkoutReturnCustomerId = order.customer_id;
        const status: PortalCheckoutReturn["status"] = order.payment_status === "paye"
          ? "paid"
          : paymentParam === "cancelled"
            ? "cancelled"
            : order.payment_status === "echoue"
              ? "failed"
              : "pending";
        checkoutReturn = {
          status,
          orderId: order.id,
          total: Number(order.total),
          estimatedReadyAt: order.estimated_ready_at,
        };
      }
    }
  }

  const selected =
    customers.length === 1
      ? customers[0]
      : customerIdParam
        ? customers.find((c) => c.id === customerIdParam)
        : checkoutReturnCustomerId
          ? customers.find((c) => c.id === checkoutReturnCustomerId)
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

  // Record daily menu view asynchronously for customer portal
  recordMenuView(selected.restaurantId).catch(() => {});

  const [data, restaurant, menuItems, offers, announcements, orderSettings] = await Promise.all([
    getPortalData(selected),
    getRestaurant(selected.restaurantId),
    getActiveMenuItemsForCustomers(selected.restaurantId),
    getActiveOffersForCustomers(selected.restaurantId),
    getActiveAnnouncements(),
    getRestaurantOrderSettings(createAdminClient(), selected.restaurantId),
  ]);
  const loyaltyTierThresholds = {
    tier2: restaurant?.loyaltyTier2Threshold ?? 150,
    tier3: restaurant?.loyaltyTier3Threshold ?? 400,
  };
  const checkoutOptions = getPublicCheckoutOptions(
    orderSettings?.orderModesEnabled ?? ["sur_place"],
    orderSettings?.onlinePaymentEnabled ?? false,
    orderSettings?.delivery.config.enabled ?? false
  );
  return (
    <PortalView
      key={`${checkoutReturn?.orderId ?? "none"}:${checkoutReturn?.status ?? "none"}`}
      customer={selected}
      data={data}
      loyaltyTierThresholds={loyaltyTierThresholds}
      menuItems={menuItems}
      offers={offers}
      taxRate={restaurant?.taxRate ?? 0.14975}
      acceptsTips={restaurant?.acceptsTips ?? false}
      restaurantTimezone={restaurant?.timezone ?? "America/Toronto"}
      fulfillmentModes={checkoutOptions.fulfillmentModes}
      canPayAtReceipt={checkoutOptions.canPayAtReceipt}
      canPayOnline={checkoutOptions.canPayOnline}
      restaurantName={restaurant?.name ?? null}
      appleWalletEnabled={isAppleWalletConfigured()}
      googleWalletEnabled={isGoogleWalletConfigured()}
      announcements={announcements}
      checkoutReturn={checkoutReturn}
    />
  );
}
