import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Compass } from "lucide-react";

export default async function NotFoundPage() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <Compass size={20} />
        </div>
        <p className="font-display text-[28px] font-medium text-mv-ink">404</p>
        <h1 className="mt-1 font-display text-[19px] font-medium text-mv-ink">{t("title")}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">{t("description")}</p>
        <Button href="/overview" className="mt-5 w-full">
          {t("cta")}
        </Button>
      </Card>
    </div>
  );
}
