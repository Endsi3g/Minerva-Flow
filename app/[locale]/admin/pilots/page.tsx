import { getPilotRequests } from "@/lib/data/pilot-requests";
import { PilotsView } from "./PilotsView";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { QrCode } from "lucide-react";

export default async function AdminPilotsPage() {
  const pilots = await getPilotRequests();
  const t = await getTranslations("admin.pilots");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
          <p className="text-[13px] text-mv-ink-soft">
            {t("newRequestsCount", { count: pilots.filter((p) => p.status === "nouveau").length })}
          </p>
        </div>
        <Button href="/admin/pilots/materiel-terrain" size="sm" variant="outline">
          <QrCode data-icon="inline-start" size={14} />
          {t("fieldKit.navLabel")}
        </Button>
      </div>
      <PilotsView pilots={pilots} />
    </div>
  );
}
