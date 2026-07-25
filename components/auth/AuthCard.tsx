"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TrendingUp, Star } from "lucide-react";
import { Google } from "@/components/ui/BrandIcons";
import Image from "next/image";

export function AuthCard({ initialMode }: { initialMode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [workspaceInviteToken, setWorkspaceInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
    const token = params.get("inviteToken");
    if (token) setInviteToken(token);
    const wToken = params.get("wInviteToken");
    if (wToken) setWorkspaceInviteToken(wToken);
  }, []);

  const postAuthPath = workspaceInviteToken
    ? `/invite/w/${workspaceInviteToken}`
    : inviteToken
      ? `/invite/${inviteToken}`
      : "/overview";

  const localizedPostAuthPath = getPathname({ href: postAuthPath, locale });

  const mapErrorMessage = (msg: string): string => {
    const normalized = msg.toLowerCase();
    if (normalized.includes("invalid login credentials")) return t("errorInvalidCredentials");
    if (normalized.includes("already registered") || normalized.includes("user already registered") || normalized.includes("already exists")) return t("errorAlreadyRegistered");
    return msg;
  };

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          posthog.identify(data.user.id, { email: data.user.email });
          posthog.capture("user_logged_in", { method: "email" });
        }
        router.push(postAuthPath);
        router.refresh();
      } else {
        if (password !== repeatPassword) throw new Error(t("errorPasswordMismatch"));
        const signUpMetadata: Record<string, string> = {};
        if (referralCode) signUpMetadata.referral_code = referralCode;
        if (inviteToken) signUpMetadata.invite_token = inviteToken;
        if (workspaceInviteToken) signUpMetadata.workspace_invite_token = workspaceInviteToken;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${localizedPostAuthPath}`,
            data: Object.keys(signUpMetadata).length > 0 ? signUpMetadata : undefined,
          },
        });
        if (error) throw error;
        if (data.user) {
          posthog.identify(data.user.id, { email: data.user.email });
          posthog.capture("user_signed_up", {
            method: "email",
            has_referral: Boolean(referralCode),
            has_invite: Boolean(inviteToken || workspaceInviteToken),
          });
        }
        if (data.session) {
          router.push(postAuthPath);
          router.refresh();
        } else {
          router.push("/sign-up-success");
        }
      }
    } catch (err) {
      posthog.captureException(err);
      setError(err instanceof Error ? mapErrorMessage(err.message) : t("errorGeneric"));
    } finally {
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${localizedPostAuthPath}` },
    });
    if (error) {
      posthog.captureException(error);
      setError(mapErrorMessage(error.message));
    }
  }

  function toggleMode() {
    setError(null);
    const newMode = mode === "login" ? "signup" : "login";
    setMode(newMode);
    const href = getPathname({ href: newMode === "login" ? "/login" : "/sign-up", locale });
    window.history.pushState(null, "", href);
  }

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ── LEFT PANEL: Form ─────────────────────────── */}
      <div className="flex w-full flex-col lg:w-[46%] xl:w-[42%]">
        {/* Logo header */}
        <div className="flex items-center gap-3 px-8 pt-8">
          <LogoMark size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-sans text-[15px] font-bold text-mv-ink leading-none">Minerva Flow</span>
            <span className="text-[10px] font-semibold text-mv-ink-soft leading-none mt-0.5">par Minerva</span>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 lg:px-14 xl:px-16">
          <div className="mx-auto w-full max-w-[360px]">

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <h1 className="font-display text-[28px] font-bold tracking-tight text-mv-ink leading-tight">
                  {mode === "login" ? "Content de vous revoir." : "Créer un compte."}
                </h1>
                <p className="mt-1.5 text-[13.5px] text-mv-ink-soft">
                  {mode === "login"
                    ? "Pilotez votre établissement en toute simplicité."
                    : "Rejoignez la plateforme de gestion pour restaurants et cafés."}
                </p>
              </motion.div>
            </AnimatePresence>

            <form onSubmit={handleAuth} className="mt-7 flex flex-col gap-4">
              {/* Google OAuth */}
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[13.5px] font-semibold text-mv-ink shadow-sm transition-all hover:bg-gray-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-mv-green/20"
              >
                <Google size={17} />
                Continuer avec Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e8e8e6]" />
                <span className="text-[11.5px] font-medium text-mv-ink-faint">ou continuer avec votre courriel</span>
                <div className="h-px flex-1 bg-[#e8e8e6]" />
              </div>

              {/* Email */}
              <div>
                <Input
                  type="email"
                  placeholder="Adresse courriel"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[13.5px] placeholder:text-mv-ink-faint focus:border-mv-green/60 focus:ring-mv-green/20"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-mv-ink-soft">Mot de passe</span>
                  {mode === "login" && (
                    <Link
                      href="/forgot-password"
                      className="text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  )}
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[13.5px] focus:border-mv-green/60 focus:ring-mv-green/20"
                />
              </div>

              {/* Confirm password (signup only) */}
              <AnimatePresence initial={false}>
                {mode === "signup" && (
                  <motion.div
                    key="confirmPwd"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="mb-1.5">
                      <span className="text-[12px] font-semibold text-mv-ink-soft">Confirmer le mot de passe</span>
                    </div>
                    <Input
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[13.5px] focus:border-mv-green/60 focus:ring-mv-green/20"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-600">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-mv-ink text-[13.5px] font-bold text-white transition-all hover:bg-mv-ink/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-mv-ink/30"
              >
                {isLoading
                  ? "Traitement..."
                  : mode === "login"
                    ? "Se connecter"
                    : "Créer mon compte"}
              </button>

              {/* Toggle */}
              <p className="text-center text-[12.5px] text-mv-ink-faint">
                {mode === "login" ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-mv-green-dark hover:underline focus:outline-none"
                >
                  {mode === "login" ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </form>

            {/* Legal */}
            <p className="mt-6 text-center text-[11px] leading-relaxed text-mv-ink-faint">
              En créant un compte, vous acceptez nos{" "}
              <Link href="/legal/terms" className="underline hover:text-mv-ink-soft">
                Conditions d&apos;utilisation
              </Link>{" "}
              et notre{" "}
              <Link href="/legal/privacy" className="underline hover:text-mv-ink-soft">
                Politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Restaurant Visual ───────────── */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:justify-end">
        {/* Background image */}
        <Image
          src="/auth-restaurant-bg.jpg"
          alt="Restaurant ambiance Minerva"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />

        {/* Deep green gradient overlay — harmonizes with Melk-style mint green palette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b1a]/92 via-[#1a4a2e]/60 to-[#0d2b1a]/30" />

        {/* Content overlay */}
        <div className="relative z-10 p-10 xl:p-14">
          {/* Star badge */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-200">
              100+ établissements
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-display text-[36px] font-bold leading-tight text-white xl:text-[42px]">
            Pilotez votre restaurant,<br />posez n&apos;importe quelle question.
          </h2>

          {/* KPI floating card */}
          <div className="mt-8 w-[280px] rounded-2xl border border-emerald-400/20 bg-[#0d2b1a]/60 p-5 backdrop-blur-md xl:w-[300px]">
            <div className="flex items-center justify-between text-white/60">
              <span className="text-[11px] font-bold uppercase tracking-wider">Revenu ce mois</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <TrendingUp size={12} className="text-white" />
              </div>
            </div>
            <p className="mt-2 font-display text-[30px] font-bold text-white">
              48 290 $
            </p>
            <span className="text-[11.5px] font-semibold text-emerald-400">↑ +18.4% vs mois dernier</span>
            {/* Mini sparkline bars */}
            <div className="mt-4 flex items-end gap-1">
              {[28, 42, 35, 55, 48, 62, 58, 70, 65, 80, 72, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-white/20"
                  style={{ height: `${(h / 88) * 36}px` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[9.5px] text-white/40">
              <span>Jan</span>
              <span>Juin</span>
              <span>Juil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
