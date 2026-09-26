import type { Metadata } from "next";
import { AppInstallGuide } from "./AppInstallGuide";

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

  return (
    <AppInstallGuide
      restaurantId={restaurantId}
      restaurantName={query.name?.trim().slice(0, 100) || null}
      menuToken={menuToken}
      orderId={orderId}
    />
  );
}
