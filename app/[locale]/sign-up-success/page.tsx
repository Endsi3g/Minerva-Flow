import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignUpSuccessPage() {
  const t = await getTranslations("auth.signUpSuccessPage");

  return (
    <AuthShell panelHeadline="Vos revenus, votre équipe, votre IA — en un seul endroit.">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mv-green/10 text-mv-green-dark">
          <MailCheck size={24} />
        </div>
        <h1 className="font-display text-[26px] font-medium text-mv-ink">{t("title")}</h1>
        <p className="text-[13.5px] leading-relaxed text-mv-ink-soft">{t("body")}</p>

        <div className="border-t border-mv-border-soft pt-4">
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-mv-green text-[13px] font-semibold text-white shadow-mv-sm transition-all hover:bg-mv-green-dark"
          >
            Retourner à la connexion
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
