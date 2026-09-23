import { NextResponse } from "next/server";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { getActiveMenuItemsForCustomers } from "@/lib/data/menu";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordMenuView } from "@/lib/data/menu-views";
import { getPublicCheckoutOptions } from "@/lib/orders/checkout-options";

/**
 * Bridge for the native app's Order tab — menu_items has no customer-facing
 * RLS policy (menu_items_select requires is_restaurant_member, and a
 * loyalty customer never is one), same reason the web portal's own
 * getActiveMenuItemsForCustomers already goes through the admin client
 * rather than a plain table read. This route is that same function,
 * reached over a Bearer token instead of a session cookie.
 */
export async function GET(req: Request) {
  const customer = await resolveNativeCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Record daily menu view asynchronously for native app browsing
  recordMenuView(customer.restaurantId).catch(() => {});

  const [items, settings] = await Promise.all([
    getActiveMenuItemsForCustomers(customer.restaurantId),
    getRestaurantOrderSettings(createAdminClient(), customer.restaurantId),
  ]);
  const checkout = getPublicCheckoutOptions(
    settings?.orderModesEnabled ?? [],
    settings?.onlinePaymentEnabled ?? false,
    Boolean(settings?.delivery.config.enabled)
  );
  return NextResponse.json({
    items,
    taxRate: settings?.taxRate ?? 0.14975,
    acceptsTips: settings?.acceptsTips ?? true,
    onlinePaymentEnabled: settings?.onlinePaymentEnabled ?? false,
    canPayAtReceipt: checkout.canPayAtReceipt,
    canPayOnline: checkout.canPayOnline,
    pickupEnabled: checkout.fulfillmentModes.includes("sur_place"),
    deliveryEnabled: checkout.fulfillmentModes.includes("livraison"),
  });
}
