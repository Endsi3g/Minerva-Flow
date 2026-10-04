"use client";

import { Suspense, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * Same visual shell and field styling as the real customer/owner login
 * (AuthShell + the mv-border/mv-cream-soft/mv-green classes from AuthCard)
 * — the user explicitly asked for "the same login, just for team members",
 * not a bespoke design. What's different is the content: no signup mode,
 * no OAuth, no workspace-invite plumbing — team accounts are provisioned
 * directly in Supabase, ambassadors already have one from the public
 * ambassador signup flow.
 */
export function TeamLoginCard() {
  return (
    <Suspense fallback={null}>
      <TeamLoginCardInner />
    </Suspense>
  );
}

function TeamLoginCardInner() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const deniedReason = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    deniedReason === "unauthorized" ? "Ce compte n’a pas accès à l’espace équipe." : null
  );

  async function waitForServerSessionCookie() {
    const hasSessionCookie = () =>
      document.cookie.split(";").some((cookie) => {
        const name = cookie.trim().split("=", 1)[0];
        return name.startsWith("sb-") && name.includes("-auth-token");
      });
    const deadline = Date.now() + 5_000;
    while (!hasSessionCookie() && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    if (!hasSessionCookie()) {
      throw new Error("La session sécurisée ne s’est pas enregistrée. Réessaie.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message.toLowerCase().includes("invalid login credentials") ? "Identifiants invalides." : authErr.message);
        setIsLoading(false);
        return;
      }
      await waitForServerSessionCookie();
      window.location.assign(getPathname({ href: "/equipe", locale }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "La connexion a échoué.");
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      panelHeadline="L'équipe et les ambassadeurs qui font avancer Minerva Flow."
      panelPoints={[
        { title: "Un seul endroit", description: "Statistiques internes pour l'équipe, outils de parrainage pour les ambassadeurs." },
        { title: "Accès restreint", description: "Réservé aux comptes Minerva Flow vérifiés — distinct de l'espace client/restaurant." },
      ]}
    >
      <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
        Espace équipe
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
        Connexion réservée à l’équipe Minerva Flow et aux ambassadeurs vérifiés.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-mv-ink-soft">Courriel</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-mv-ink-soft">Mot de passe</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
          />
        </div>

        {error && <div className="rounded-xl border border-mv-red/25 bg-mv-red-bg p-3 text-[12.5px] text-mv-red">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mv-green text-[13px] font-semibold tracking-wide text-white shadow-mv-sm transition-all hover:bg-mv-green-dark active:translate-y-px disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Connexion…</span>
            </>
          ) : (
            <>
              <span>Se connecter</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 border-t border-mv-border-soft pt-5 text-[12px] text-mv-ink-faint">
        <ShieldCheck size={13} className="text-mv-green-dark" />
        <span>Espace isolé du compte client/restaurant.</span>
      </div>
    </AuthShell>
  );
}
