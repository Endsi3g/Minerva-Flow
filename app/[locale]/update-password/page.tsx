"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Defaults to the restaurant-staff dashboard (the only case that existed
  // before this param) — the native customer app's reset link passes
  // next=/portal so a customer following it doesn't land on a page they
  // have no restaurant membership to see.
  const nextPath = searchParams?.get("next") || "/overview";
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
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell panelHeadline="Pilotez votre restaurant, sereinement.">
      <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
        Nouveau mot de passe
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
        Définissez votre nouveau mot de passe pour sécuriser votre compte.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Nouveau mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              <span>Enregistrement…</span>
            </>
          ) : (
            <span>Mettre à jour le mot de passe</span>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-mv-cream p-4">
          <div className="h-[420px] w-full max-w-[440px] animate-pulse rounded-3xl border border-mv-border bg-mv-surface" />
        </div>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  );
}
