import { ProspectGenerator } from "../ProspectGenerator";
import { getTranslations } from "next-intl/server";

export default async function NewProspectPage() {
  const t = await getTranslations("admin.prospects");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("newPageTitle")}</h1>
      <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-mv-ink-soft">{t("newPageDescription")}</p>
      <ProspectGenerator prospect={null} />
    </div>
  );
}
