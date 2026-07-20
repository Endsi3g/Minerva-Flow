import { getChangelogEntries } from "@/lib/data/changelog";
import { ChangelogAdminView } from "./ChangelogAdminView";
import { getTranslations } from "next-intl/server";

export default async function AdminChangelogPage() {
  const entries = await getChangelogEntries();
  const t = await getTranslations("admin.changelog");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("pageDescription")}
      </p>
      <ChangelogAdminView initialEntries={entries} />
    </div>
  );
}
