import type { Metadata } from "next";
import { AppInstallGuide } from "./AppInstallGuide";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Installer Minerva Flow",
  description: "Installez Minerva Flow, rejoignez votre restaurant et suivez vos commandes et vos points.",
  openGraph: {
    title: "Votre restaurant, dans Minerva Flow",
    description: "Installez l’application, créez votre compte et retrouvez vos commandes et vos points.",
    images: ["/assets/install/native-home.png"],
  },
};

export default async function AppInstallPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string; name?: string; menu?: string; order?: string }>;
}) {
  const query = await searchParams;
  const restaurantId = query.restaurant && /^[0-9a-f-]{36}$/i.test(query.restaurant) ? query.restaurant : null;
  const menuToken = query.menu && /^[a-z0-9_-]{8,100}$/i.test(query.menu) ? query.menu : null;
  const orderId = query.order && /^[0-9a-f-]{36}$/i.test(query.order) ? query.order : null;

  // Only one public number is read: the points a new customer gets on first
  // opening the app. Any failure just hides the bonus line.
  let bonusPoints = 0;
  if (restaurantId) {
    try {
      const { data } = await createAdminClient().from("restaurants").select("app_install_bonus_points").eq("id", restaurantId).maybeSingle();
      bonusPoints = Number((data as { app_install_bonus_points: number | null } | null)?.app_install_bonus_points ?? 0) || 0;
    } catch {
      bonusPoints = 0;
    }
  }

  return (
    <AppInstallGuide
      bonusPoints={bonusPoints}
      restaurantId={restaurantId}
      restaurantName={query.name?.trim().slice(0, 100) || null}
      menuToken={menuToken}
      orderId={orderId}
    />
  );
}
