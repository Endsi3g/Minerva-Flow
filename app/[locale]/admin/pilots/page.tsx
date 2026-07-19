import { getPilotRequests } from "@/lib/data/pilot-requests";
import { PilotsView } from "./PilotsView";
import { getTranslations } from "next-intl/server";

export default async function AdminPilotsPage() {
  const pilots = await getPilotRequests();
  const t = await getTranslations("admin.pilots");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("newRequestsCount", { count: pilots.filter((p) => p.status === "nouveau").length })}
      </p>
      <PilotsView pilots={pilots} />
    </div>
  );
}
