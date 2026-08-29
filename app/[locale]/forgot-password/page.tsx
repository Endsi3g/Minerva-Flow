"use client";

import { createClient } from "@/lib/supabase/client";
import { MailCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

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
    <AuthShell panelHeadline="Pilotez votre restaurant, sereinement.">
      {success ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mv-green/10 text-mv-green-dark">
            <MailCheck size={24} />
          </div>
          <h1 className="font-display text-[26px] font-medium text-mv-ink">Vérifiez vos courriels</h1>
          <p className="text-[13.5px] leading-relaxed text-mv-ink-soft">
            Un lien de réinitialisation a été envoyé à l&apos;adresse <strong className="text-mv-ink">{email}</strong>.
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
            Saisissez votre courriel pour recevoir un lien de réinitialisation sécurisé.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Adresse courriel</label>
              <input
                type="email"
                placeholder="nom@restaurant.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-mv-red/25 bg-mv-red-bg p-3 text-[12.5px] text-mv-red">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mv-green text-[13px] font-semibold tracking-wide text-white shadow-mv-sm transition-all hover:bg-mv-green-dark disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Envoi en cours…</span>
                </>
              ) : (
                <span>Envoyer le lien</span>
              )}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 border-t border-mv-border-soft pt-5 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-green-dark hover:underline">
          <ArrowLeft size={13} />
          <span>Retour à la connexion</span>
        </Link>
      </div>
    </AuthShell>
  );
}
