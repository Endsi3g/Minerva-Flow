"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F5] text-[#1F1E1D]">
      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="text-center space-y-2 mb-6">
            <Link href="/overview" className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#0E7C5A] text-white font-serif font-bold text-lg shadow-xs border border-[#0E7C5A]/30 mb-1 hover:scale-105 transition-transform">
              <Lock size={18} />
            </Link>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#0A3F2F]">
              Nouveau mot de passe
            </h1>
            <p className="text-xs sm:text-[13px] text-[#6A6860] leading-relaxed">
              Définissez votre nouveau mot de passe pour sécuriser votre compte.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#5A5851] mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Mettre à jour le mot de passe</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
