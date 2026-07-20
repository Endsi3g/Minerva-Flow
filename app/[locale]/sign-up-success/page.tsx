import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SignUpSuccessPage() {
  const t = useTranslations("auth.signUpSuccessPage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Flow <span className="text-mv-green-dark">par Minerva</span>
        </span>
      </div>

      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <MailCheck size={20} />
        </div>
        <h1 className="font-display text-[19px] font-medium text-mv-ink">{t("title")}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">{t("body")}</p>
      </Card>
    </div>
  );
}
