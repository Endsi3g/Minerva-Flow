import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";
import { Link } from "@/i18n/navigation";

export default function SignUpSuccessPage() {
  const t = useTranslations("auth.signUpSuccessPage");

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden text-white">
      <MeshDriftBackground />

      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#181816] border border-[#2E2E2A] rounded-3xl p-7 sm:p-9 shadow-[0_24px_70px_rgba(0,0,0,0.85)] text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E7C5A]/20 border border-[#7CE577]/30 text-[#7CE577]">
            <MailCheck size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#F4FFC7]">{t("title")}</h1>
          <p className="text-xs sm:text-[13px] leading-relaxed text-[#A8A7A0]">{t("body")}</p>

          <div className="pt-4 border-t border-[#262624]">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white text-xs font-bold transition-all shadow-md"
            >
              Retourner à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
