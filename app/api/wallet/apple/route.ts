import { NextResponse } from "next/server";
import { isAppleWalletConfigured } from "@/lib/wallet/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getLoyaltyTier, loyaltyTierLabel } from "@/lib/loyalty-tiers";
import { buildAppleLoyaltyPass } from "@/lib/wallet/apple-wallet";

/**
 * Apple Wallet passes need a full PKCS#7-signed .pkpass bundle, which needs
 * an Apple Developer Program membership and its Pass Type ID certificate —
 * see the comment on isAppleWalletConfigured() in lib/wallet/config.ts for
 * why that signing step is a documented follow-up rather than code here.
 * This route is real and ready to build the pass from once those certs
 * exist; until then it degrades to a clear "not available yet" response
 * instead of a broken pass.
 */
export async function GET(request: Request) {
  if (!isAppleWalletConfigured()) {
    console.warn("[Apple Wallet] missing APPLE_WALLET_* certificate settings");
    return NextResponse.json(
      {
        error: "L'ajout à Apple Wallet n'est pas encore disponible.",
        code: "WALLET_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "customerId requis." }, { status: 400 });

  // The iOS app calls this with a Bearer token, the web portal with its session cookie.
  let userId = await resolveNativeUserId(request);
  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  // Only the card's own holder can download it: never trust the customerId alone.
  const admin = createAdminClient();
  const { data: customer, error } = await admin
    .from("customers")
    .select("id, name, phone, loyalty_points, total_spent, restaurant_id, restaurants(name, loyalty_tier_2_threshold, loyalty_tier_3_threshold)")
    .eq("id", customerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !customer) return NextResponse.json({ error: "Carte fidélité introuvable." }, { status: 404 });

  const restaurant = Array.isArray(customer.restaurants) ? customer.restaurants[0] : customer.restaurants;
  try {
    const pass = buildAppleLoyaltyPass({
      customerId: customer.id,
      customerName: customer.name || "Membre Minerva Flow",
      customerPhone: customer.phone,
      restaurantName: restaurant?.name || "Minerva Flow",
      points: Number(customer.loyalty_points || 0),
      tierLabel: loyaltyTierLabel[
        getLoyaltyTier(Number(customer.total_spent || 0), {
          tier2: restaurant?.loyalty_tier_2_threshold ?? 150,
          tier3: restaurant?.loyalty_tier_3_threshold ?? 400,
        })
      ],
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app"}/portal`,
    });
    return new NextResponse(pass as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="minerva-flow-${customer.id}.pkpass"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (passError) {
    console.warn("[Apple Wallet] Failed to generate pass:", passError);
    return NextResponse.json(
      {
        error: "Génération du pass Apple Wallet temporairement indisponible. Les certificats doivent être renouvelés ou validés.",
        code: "WALLET_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
