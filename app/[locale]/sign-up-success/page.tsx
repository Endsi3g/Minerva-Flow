import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SignUpSuccessPage() {
  const t = useTranslations("auth.signUpSuccessPage");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F5] text-[#1F1E1D]">
      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 text-[#0E7C5A]">
            <MailCheck size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#0A3F2F]">{t("title")}</h1>
          <p className="text-xs sm:text-[13px] leading-relaxed text-[#6A6860]">{t("body")}</p>

          <div className="pt-4 border-t border-[#F0EFEA]">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white text-xs font-bold transition-all shadow-xs"
            >
              Retourner à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
