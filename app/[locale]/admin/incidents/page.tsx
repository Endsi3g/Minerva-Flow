import { getIncidents } from "@/lib/data/incidents";
import { IncidentsView } from "./IncidentsView";
import { getTranslations } from "next-intl/server";

export default async function AdminIncidentsPage() {
  const incidents = await getIncidents();
  const t = await getTranslations("admin.incidents");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("pageDescription")}
      </p>
      <IncidentsView initialIncidents={incidents} />
    </div>
  );
}
