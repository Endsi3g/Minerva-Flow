import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getLoyaltyTier, loyaltyTierLabel } from "@/lib/loyalty-tiers";
import { parseCustomerLanguage } from "@/lib/i18n/customer-language";
import { isGoogleWalletConfigured } from "@/lib/wallet/config";
import { buildGoogleWalletSaveUrl } from "@/lib/wallet/google-wallet";

/**
 * "Add to Google Wallet" for the signed-in holder of a loyalty card.
 *
 * The web portal reaches this with its session cookie and is redirected to Google.
 * The Android app calls it with a Bearer token and gets `{ url }` back instead (a
 * redirect would lose the app's headers and cannot open Wallet from inside the app).
 */
export async function GET(req: Request) {
  if (!isGoogleWalletConfigured()) {
    console.warn("[Google Wallet] missing GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL / GOOGLE_WALLET_PRIVATE_KEY");
    return NextResponse.json(
      { error: "L'ajout à Google Wallet n'est pas encore disponible.", code: "WALLET_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId requis." }, { status: 400 });
  }

  let userId = await resolveNativeUserId(req);
  const viaBearer = userId !== null;
  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Never trust the customerId param on its own: only the card's own holder gets a pass.
  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone, total_spent, loyalty_points, preferred_language, restaurant_id, restaurants(name, color, loyalty_tier_2_threshold, loyalty_tier_3_threshold)")
    .eq("id", customerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const restaurant = Array.isArray(customer.restaurants) ? customer.restaurants[0] : customer.restaurants;
  const tier = getLoyaltyTier(Number(customer.total_spent ?? 0), {
    tier2: restaurant?.loyalty_tier_2_threshold ?? 150,
    tier3: restaurant?.loyalty_tier_3_threshold ?? 400,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const saveUrl = buildGoogleWalletSaveUrl({
    customerId: customer.id,
    customerName: customer.name,
    // The counter identifies a guest by phone number, so the pass barcode carries it.
    customerPhone: customer.phone,
    restaurantId: customer.restaurant_id,
    restaurantName: restaurant?.name ?? "Minerva Flow",
    points: Number(customer.loyalty_points ?? 0),
    tierLabel: loyaltyTierLabel[tier],
    portalUrl: `${appUrl}/portal?customer=${customer.id}`,
    brandColorHex: restaurant?.color || "#167f5b",
    language: parseCustomerLanguage(customer.preferred_language),
  });

  return viaBearer ? NextResponse.json({ url: saveUrl }) : NextResponse.redirect(saveUrl);
}
