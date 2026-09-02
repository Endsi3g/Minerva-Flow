import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomersForUser } from "@/lib/data/customer-portal";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLoyaltyTier, loyaltyTierLabel } from "@/lib/loyalty-tiers";
import { isGoogleWalletConfigured } from "@/lib/wallet/config";
import { buildGoogleWalletSaveUrl } from "@/lib/wallet/google-wallet";

export async function GET(req: Request) {
  if (!isGoogleWalletConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Wallet n'est pas encore configuré (GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL / GOOGLE_WALLET_PRIVATE_KEY manquants).",
      },
      { status: 503 }
    );
  }

  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId requis." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Never trust the customerId param on its own — only serve a pass for a
  // customer record that actually belongs to the signed-in user.
  const ownedCustomers = await getCustomersForUser(user.id);
  const customer = ownedCustomers.find((c) => c.id === customerId);
  if (!customer) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const restaurant = await getRestaurant(customer.restaurantId);
  const tier = getLoyaltyTier(customer.totalSpent, {
    tier2: restaurant?.loyaltyTier2Threshold ?? 150,
    tier3: restaurant?.loyaltyTier3Threshold ?? 400,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const saveUrl = buildGoogleWalletSaveUrl({
    customerId: customer.id,
    customerName: customer.name,
    restaurantId: customer.restaurantId,
    restaurantName: restaurant?.name ?? "Minerva Flow",
    points: customer.loyaltyPoints,
    tierLabel: loyaltyTierLabel[tier],
    portalUrl: `${appUrl}/portal?customer=${customer.id}`,
    brandColorHex: restaurant?.color || "#167f5b",
  });

  return NextResponse.redirect(saveUrl);
}
