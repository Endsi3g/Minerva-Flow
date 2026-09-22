import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { PageHeader } from "@/components/ui/PageHeader";
import { IntegrationsGrid } from "@/components/minerva/IntegrationsGrid";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("integrations") };
}

export default async function IntegrationsPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) {
    redirect("/overview");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Écosystème & Connexions"
        title="Intégrations"
        description="Connectez vos caisses POS, passerelles de paiement, comptabilité, plateformes publicitaires et services de livraison."
      />
      <IntegrationsGrid />
    </div>
  );
}
