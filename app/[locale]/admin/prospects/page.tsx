import { getProspects } from "@/lib/data/prospects";
import { ProspectsListView } from "./ProspectsListView";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

export default async function AdminProspectsPage() {
  const prospects = await getProspects();
  const t = await getTranslations("admin.prospects");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
          <p className="text-[13px] text-mv-ink-soft">{t("countDescription", { count: prospects.length })}</p>
        </div>
        <Button href="/admin/prospects/new" size="sm">
          <Zap data-icon="inline-start" size={14} />
          {t("newProspect")}
        </Button>
      </div>
      <ProspectsListView prospects={prospects} />
    </div>
  );
}
