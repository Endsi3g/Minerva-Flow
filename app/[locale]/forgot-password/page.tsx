"use client";

import { createClient } from "@/lib/supabase/client";
import { MailCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectPath = getPathname({ href: "/update-password", locale });
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${redirectPath}`,
      });
      if (resetErr) throw resetErr;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden text-[#1F1E1D]">
      {/* Soft Emerald WebGL Mesh Drift Shader Background */}
      <MeshDriftBackground variant="soft-emerald" />

      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border-2 border-[#0E7C5A]/30 rounded-3xl p-7 sm:p-9 shadow-[0_16px_50px_rgba(14,124,90,0.12),0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-[#0E7C5A]/20">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 text-[#0E7C5A]">
                <MailCheck size={24} />
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#0A3F2F]">
                Vérifiez vos courriels
              </h1>
              <p className="text-xs sm:text-[13px] leading-relaxed text-[#6A6860]">
                Un lien de réinitialisation a été envoyé à l&apos;adresse <strong className="text-[#1F1E1D]">{email}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 mb-6">
                <Link
                  href="/overview"
                  className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/25 shadow-xs mb-1 hover:scale-105 transition-transform"
                >
                  <LogoMark size={36} />
                </Link>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-[#0A3F2F]">
                  Mot de passe oublié
                </h1>
                <p className="text-xs sm:text-[13px] text-[#6A6860] leading-relaxed">
                  Saisissez votre courriel pour recevoir un lien de réinitialisation sécurisé.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5A5851] mb-1.5">
                    Adresse courriel
                  </label>
                  <input
                    type="email"
                    placeholder="nom@restaurant.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#FAF8F5] border border-[#E2E0D8] px-3.5 text-xs sm:text-sm text-[#1F1E1D] placeholder:text-[#8A887F] focus:bg-white focus:border-[#0E7C5A] focus:outline-none focus:ring-2 focus:ring-[#0E7C5A]/15 transition-colors"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white text-xs font-bold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>Envoyer le lien</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-[#F0EFEA] text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7C5A] hover:underline"
            >
              <ArrowLeft size={13} />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
