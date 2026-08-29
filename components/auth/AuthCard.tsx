"use client";

import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState, type FormEvent } from "react";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Google } from "@/components/ui/BrandIcons";
import { AuthShell } from "@/components/auth/AuthShell";
import { SplashLoadingTips } from "@/components/auth/SplashLoadingTips";
import { cn } from "@/lib/utils";

const PANEL_POINTS = [
  { title: "Vue d'ensemble en temps réel", description: "Revenu, marge et anomalies mis à jour à mesure que la journée avance." },
  { title: "Un copilote IA qui connaît vos chiffres", description: "Posez une question en langage courant, obtenez le graphique et la réponse." },
  { title: "Rapports automatisés", description: "Un résumé de la performance de votre établissement, chaque semaine, sans y penser." },
];

function AuthCardInner({ initialMode }: { initialMode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [destinationPath, setDestinationPath] = useState<string | null>(null);

  const referralCode = searchParams?.get("ref") ?? null;
  const inviteToken = searchParams?.get("inviteToken") ?? null;
  const workspaceInviteToken = searchParams?.get("wInviteToken") ?? null;

  const postAuthPath = workspaceInviteToken
    ? `/invite/w/${workspaceInviteToken}`
    : inviteToken
      ? `/invite/${inviteToken}`
      : "/overview";

  const localizedPostAuthPath = getPathname({ href: postAuthPath, locale });

  const mapErrorMessage = (msg: string): string => {
    const normalized = msg.toLowerCase();
    if (normalized.includes("invalid login credentials")) return t("errorInvalidCredentials");
    if (
      normalized.includes("already registered") ||
      normalized.includes("user already registered") ||
      normalized.includes("already exists")
    ) {
      return t("errorAlreadyRegistered");
    }
    return msg;
  };

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw authErr;
        if (data.user) {
          posthog.identify(data.user.id, { email: data.user.email });
          posthog.capture("user_logged_in", { method: "email" });
        }
        setDestinationPath(postAuthPath);
        setShowTips(true);
      } else {
        if (password !== repeatPassword) throw new Error(t("errorPasswordMismatch"));
        const signUpMetadata: Record<string, string> = {};
        if (referralCode) signUpMetadata.referral_code = referralCode;
        if (inviteToken) signUpMetadata.invite_token = inviteToken;
        if (workspaceInviteToken) signUpMetadata.workspace_invite_token = workspaceInviteToken;

        const { data, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${localizedPostAuthPath}`,
            data: Object.keys(signUpMetadata).length > 0 ? signUpMetadata : undefined,
          },
        });
        if (authErr) throw authErr;
        if (data.user) {
          posthog.identify(data.user.id, { email: data.user.email });
          posthog.capture("user_signed_up", {
            method: "email",
            has_referral: Boolean(referralCode),
            has_invite: Boolean(inviteToken || workspaceInviteToken),
          });
        }
        if (data.session) {
          setDestinationPath(postAuthPath);
          setShowTips(true);
        } else {
          router.push("/sign-up-success");
        }
      }
    } catch (err) {
      posthog.captureException(err);
      setError(err instanceof Error ? mapErrorMessage(err.message) : t("errorGeneric"));
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    posthog.capture(mode === "login" ? "user_logged_in" : "user_signed_up", {
      method: provider,
      has_referral: Boolean(referralCode),
      has_invite: Boolean(inviteToken || workspaceInviteToken),
    });
    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${localizedPostAuthPath}` },
    });
    if (authErr) {
      posthog.captureException(authErr);
      setError(mapErrorMessage(authErr.message));
    }
  }

  function toggleMode(newMode: "login" | "signup") {
    setError(null);
    setMode(newMode);
    const href = getPathname({ href: newMode === "login" ? "/login" : "/sign-up", locale });
    window.history.pushState(null, "", href);
  }

  function handleCompleteTips() {
    if (destinationPath) {
      router.push(destinationPath);
      router.refresh();
    }
  }

  if (showTips) {
    return <SplashLoadingTips onComplete={handleCompleteTips} />;
  }

  return (
    <AuthShell
      step={mode === "signup" ? { current: 1, total: 2, label: "Compte" } : undefined}
      panelHeadline={mode === "login" ? "Pilotez votre restaurant, sereinement." : "Vos revenus, votre équipe, votre IA — en un seul endroit."}
      panelPoints={PANEL_POINTS}
      footer={
        <p className="text-center text-[11.5px] leading-relaxed text-mv-ink-faint">
          En continuant, vous acceptez les{" "}
          <Link href="/legal/terms" className="font-medium text-mv-ink-soft underline underline-offset-2 hover:text-mv-ink">
            Conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/legal/privacy" className="font-medium text-mv-ink-soft underline underline-offset-2 hover:text-mv-ink">
            Politique de confidentialité
          </Link>
          .
        </p>
      }
    >
      <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
        {mode === "login" ? "Content de vous revoir" : "Créer votre compte"}
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
        {mode === "login"
          ? "Accédez à votre espace de pilotage."
          : "Aucune carte requise — configurez votre établissement en deux minutes."}
      </p>

      {/* Mode switcher */}
      <div className="mt-6 flex rounded-xl border border-mv-border bg-mv-cream-soft p-1">
        <button
          type="button"
          onClick={() => toggleMode("login")}
          className={cn(
            "flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all",
            mode === "login" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink-soft"
          )}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => toggleMode("signup")}
          className={cn(
            "flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all",
            mode === "signup" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink-soft"
          )}
        >
          Créer un compte
        </button>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => handleOAuth("google")}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink shadow-mv-sm transition-colors hover:bg-mv-cream-soft focus:outline-none focus:ring-2 focus:ring-mv-green/20"
      >
        <Google size={16} />
        <span>Continuer avec Google</span>
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-mv-border" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-mv-ink-faint">Ou par courriel</span>
        <div className="h-px flex-1 bg-mv-border" />
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Adresse courriel</label>
          <input
            type="email"
            placeholder="demo@minervaflow.app"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11.5px] font-semibold text-mv-ink-soft">Mot de passe</label>
            {mode === "login" && (
              <Link href="/forgot-password" className="text-[11.5px] font-semibold text-mv-green-dark hover:underline">
                Oublié ?
              </Link>
            )}
          </div>
          <input
            type="password"
            placeholder="••••••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Confirmer le mot de passe</label>
            <input
              type="password"
              placeholder="••••••••••••"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-mv-red/25 bg-mv-red-bg p-3 text-[12.5px] text-mv-red">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mv-green text-[13px] font-semibold tracking-wide text-white shadow-mv-sm transition-all hover:bg-mv-green-dark active:translate-y-px disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Vérification…</span>
            </>
          ) : (
            <>
              <span>{mode === "login" ? "Accéder à l'espace" : "Continuer"}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 border-t border-mv-border-soft pt-5 text-[11px] text-mv-ink-faint">
        <ShieldCheck size={13} className="text-mv-green-dark" />
        <span>Sécurisé · Conforme données d&apos;exploitation</span>
      </div>
    </AuthShell>
  );
}

export function AuthCard({ initialMode }: { initialMode: "login" | "signup" }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-mv-cream p-4">
          <div className="h-[560px] w-full max-w-[440px] animate-pulse rounded-3xl border border-mv-border bg-mv-surface" />
        </div>
      }
    >
      <AuthCardInner initialMode={initialMode} />
    </Suspense>
  );
}
