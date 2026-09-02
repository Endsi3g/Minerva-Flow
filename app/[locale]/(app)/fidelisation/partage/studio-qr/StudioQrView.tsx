"use client";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { QrTableStandStudio } from "@/components/fidelisation/QrTableStandStudio";
import { ArrowLeft } from "lucide-react";

export function StudioQrView({ restaurantName, portalUrl }: { restaurantName: string; portalUrl: string }) {
  return (
    <div>
      <FidelisationSubNav />

      <Link
        href="/fidelisation/partage"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={13} /> Retour au partage
      </Link>

      <PageHeader
        eyebrow="Croissance"
        title="Studio de QR Codes & Affiches de Table"
        description="Créez et téléchargez des supports physiques élégants pour vos tables et comptoirs — format, thème, textes et lien scanné, tous personnalisables."
      />

      <QrTableStandStudio restaurantName={restaurantName} portalUrl={portalUrl} />
    </div>
  );
}
