import { getAllRestaurantsForAdmin } from "@/lib/data/admin";
import { formatDate } from "@/lib/utils";
import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminRestaurantsPage() {
  const restaurants = await getAllRestaurantsForAdmin();
  const t = await getTranslations("admin.restaurants");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("countDescription", { count: restaurants.length })}
      </p>

      {restaurants.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">{t("emptyState")}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-mv-border bg-mv-cream-soft">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  {t("colName")}
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  {t("colCity")}
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  {t("colMembers")}
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  {t("colCreatedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id} className="border-b border-mv-border-soft last:border-0">
                  <td className="flex items-center gap-2 px-4 py-3 font-semibold text-mv-ink">
                    <Store size={14} className="text-mv-ink-faint" /> {r.name}
                  </td>
                  <td className="px-4 py-3 text-mv-ink-soft">{r.city}</td>
                  <td className="px-4 py-3 text-mv-ink-soft">{r.memberCount}</td>
                  <td className="px-4 py-3 text-mv-ink-soft">{formatDate(r.createdAt.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
