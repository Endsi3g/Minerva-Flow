import { QrFieldKitGenerator } from "@/components/prospects/QrFieldKitGenerator";
import { getTranslations } from "next-intl/server";

export default async function FieldKitPage() {
  const t = await getTranslations("admin.pilots.fieldKit");

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
      <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-mv-ink-soft">{t("pageDescription")}</p>
      <QrFieldKitGenerator />
    </div>
  );
}
