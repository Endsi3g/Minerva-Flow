import { getAllSupportRequestsForAdmin } from "@/lib/data/admin";
import { SupportAdminView } from "./SupportAdminView";
import { getTranslations } from "next-intl/server";

export default async function AdminSupportPage() {
  const tickets = await getAllSupportRequestsForAdmin();
  const t = await getTranslations("admin.support");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("openTicketsCount", { count: tickets.filter((ticket) => ticket.status !== "resolu").length })}
      </p>
      <SupportAdminView tickets={tickets} />
    </div>
  );
}
