"use client";

import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState, type FormEvent } from "react";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Google } from "@/components/ui/BrandIcons";
import { LogoMark } from "@/components/shell/Logo";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";
import { SplashLoadingTips } from "@/components/auth/SplashLoadingTips";
import { cn } from "@/lib/utils";

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden text-[#1F1E1D]">
      {/* ── 0. Animated Green WebGL Mesh Drift Shader Background All Around ── */}
      <MeshDriftBackground variant="dark" />

      {/* ── 1. Centered Auth Card Matching Image 1 Exactly ── */}
      <div className="w-full max-w-[440px] my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Solid Pure White Card with Clean Subtle Border */}
        <div className="bg-white border border-[#E2E0D8] rounded-3xl p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          
          {/* Official App Logo & Non-Serif Typography */}
          <div className="text-center space-y-2 mb-6">
            <Link
              href="/overview"
              className="inline-flex items-center justify-center mb-1 hover:scale-105 transition-transform"
            >
              <LogoMark size={46} />
            </Link>
            <h1 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-[#0A3F2F]">
              Minerva Flow
            </h1>
            <p className="font-sans text-xs sm:text-[13px] text-[#6A6860] max-w-xs mx-auto leading-relaxed">
              {mode === "login"
                ? "Plateforme d'intelligence et pilotage pour restaurateurs & cafés"
                : "Rejoignez plus de 100+ établissements innovants"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#F5F3ED] border border-[#E8E5DF] rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => toggleMode("login")}
              className={cn(
                "flex-1 py-2 font-sans text-xs font-bold rounded-xl transition-all",
                mode === "login"
                  ? "bg-white text-[#0A3F2F] shadow-xs border border-[#E8E5DF]"
                  : "text-[#8A887F] hover:text-[#1F1E1D]"
              )}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => toggleMode("signup")}
              className={cn(
                "flex-1 py-2 font-sans text-xs font-bold rounded-xl transition-all",
                mode === "signup"
                  ? "bg-white text-[#0A3F2F] shadow-xs border border-[#E8E5DF]"
                  : "text-[#8A887F] hover:text-[#1F1E1D]"
              )}
            >
              Créer un compte
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-gray-50 border border-[#E2E0D8] font-sans text-xs font-bold text-[#1F1E1D] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0E7C5A]/20"
          >
            <Google size={16} />
            <span>Continuer avec Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#E8E5DF]" />
            <span className="text-[10.5px] font-mono text-[#8A887F] uppercase tracking-wider">OU PAR COURRIEL</span>
            <div className="h-px flex-1 bg-[#E8E5DF]" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block font-sans text-[11.5px] font-semibold text-[#5A5851] mb-1.5">
                Adresse courriel
              </label>
              <input
                type="email"
                placeholder="demo@minervaflow.app"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#F8F7F4] border border-[#E2E0D8] px-3.5 font-sans text-xs sm:text-sm text-[#1F1E1D] placeholder:text-[#8A887F] focus:bg-white focus:border-[#0E7C5A] focus:outline-none focus:ring-2 focus:ring-[#0E7C5A]/15 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-sans text-[11.5px] font-semibold text-[#5A5851]">
                  Mot de passe
                </label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="font-sans text-[11.5px] font-semibold text-[#0E7C5A] hover:underline"
                  >
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
                className="w-full h-11 rounded-xl bg-[#F8F7F4] border border-[#E2E0D8] px-3.5 font-sans text-xs sm:text-sm text-[#1F1E1D] placeholder:text-[#8A887F] focus:bg-white focus:border-[#0E7C5A] focus:outline-none focus:ring-2 focus:ring-[#0E7C5A]/15 transition-colors"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block font-sans text-[11.5px] font-semibold text-[#5A5851] mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#F8F7F4] border border-[#E2E0D8] px-3.5 font-sans text-xs sm:text-sm text-[#1F1E1D] placeholder:text-[#8A887F] focus:bg-white focus:border-[#0E7C5A] focus:outline-none focus:ring-2 focus:ring-[#0E7C5A]/15 transition-colors"
                />
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 font-sans text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] active:translate-y-px text-white font-sans text-xs font-bold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Accéder à l'espace" : "Créer mon compte"}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Guarantee Pill */}
          <div className="mt-6 pt-5 border-t border-[#F0EFEA] flex items-center justify-center gap-2 text-[11px] text-[#8A887F]">
            <ShieldCheck size={13} className="text-[#0E7C5A]" />
            <span>Sécurisé · Conforme données d&apos;exploitation</span>
          </div>

        </div>

        {/* Footer Links */}
        <p className="mt-4 text-center font-sans text-[11px] text-white/80 drop-shadow-sm">
          En continuant, vous acceptez les{" "}
          <Link href="/legal/terms" className="underline hover:text-white">
            Conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/legal/privacy" className="underline hover:text-white">
            Politique de confidentialité
          </Link>
          .
        </p>

      </div>
    </div>
  );
}

export function AuthCard({ initialMode }: { initialMode: "login" | "signup" }) {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#03120E]">
          <MeshDriftBackground variant="dark" />
          <div className="w-full max-w-[440px] h-[520px] bg-white border border-[#E2E0D8] rounded-3xl animate-pulse" />
        </div>
      }
    >
      <AuthCardInner initialMode={initialMode} />
    </Suspense>
  );
}
