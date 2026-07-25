"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, Star } from "lucide-react";
import { Google } from "@/components/ui/BrandIcons";

export function OriginRightPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#06140d] p-8 xl:p-14 text-white">
      {/* Background starry night gradient & ambient radial glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#113824] via-[#081e13] to-[#040d08]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Subtle Star Particles Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Content Center */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center max-w-lg mx-auto">
        {/* Decorative thin accent line */}
        <div className="mb-6 h-px w-16 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

        {/* Headline in Serif (New York / Playfair Display) */}
        <h2 className="font-display text-[32px] sm:text-[36px] xl:text-[42px] font-normal leading-[1.18] text-white/95 tracking-tight">
          Pilotez vos revenus,<br />
          posez n&apos;importe quelle question.<br />
          <span className="italic font-light text-emerald-200">Maîtrisez votre restaurant.</span>
        </h2>

        {/* Laurel Star Rating Badge */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-[11.5px] font-bold tracking-widest text-emerald-300 uppercase">
            100+ Établissements
          </span>
        </div>

        {/* Glassmorphism KPI Card (Origin style chart) */}
        <div className="mt-10 w-full max-w-[340px] rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-white/60 uppercase">
              REVENU CE MOIS
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Sparkles size={12} />
            </div>
          </div>

          <div className="mt-3 text-left">
            <p className="font-display text-[34px] font-semibold text-white tracking-tight">
              24 850 $
            </p>
            <p className="text-[11.5px] font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
              <span>● Juillet 2026</span>
              <span className="ml-auto text-emerald-300 font-semibold">+18.4%</span>
            </p>
          </div>

          {/* Smooth Curved SVG Line Chart (Static, no pulse animation) */}
          <div className="mt-5 h-20 w-full">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="originChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Fill area */}
              <path
                d="M 0 50 Q 50 45, 75 35 T 150 25 T 225 15 T 300 8 L 300 60 L 0 60 Z"
                fill="url(#originChartGrad)"
              />
              {/* Stroke line */}
              <path
                d="M 0 50 Q 50 45, 75 35 T 150 25 T 225 15 T 300 8"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Dot on last point */}
              <circle cx="300" cy="8" r="4" fill="#34d399" />
              <circle cx="300" cy="8" r="2.5" fill="#ffffff" />
            </svg>
          </div>

          {/* X-Axis dates */}
          <div className="mt-2 flex justify-between font-mono text-[10px] text-white/40">
            <span>01</span>
            <span>07</span>
            <span>14</span>
            <span>21</span>
            <span>28</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* ── LEFT PANEL: Full Screen Edge-to-Edge Form (55% width) ── */}
      <div className="flex w-full flex-col justify-between p-8 sm:p-12 lg:w-[55%] xl:w-[50%] lg:p-16">
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <LogoMark size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-sans text-[15px] font-bold text-mv-ink leading-none">Minerva Flow</span>
            <span className="text-[10px] font-semibold text-mv-ink-soft leading-none mt-0.5">par Minerva</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-auto mx-auto w-full max-w-[360px] py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <h1 className="font-display text-[30px] sm:text-[34px] font-bold tracking-tight text-mv-ink leading-tight text-center">
                {mode === "login" ? "Connexion" : "Créer un compte"}
              </h1>
              <p className="mt-2 text-center text-[13.5px] text-mv-ink-soft">
                {mode === "login"
                  ? "Pilotez l'exploitation de votre établissement."
                  : "Rejoignez la plateforme unifiée pour restaurants & cafés."}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.form layout onSubmit={handleAuth} className="mt-8 flex flex-col gap-4">
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
            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-[#e8e8e6]" />
              <span className="text-[11.5px] font-medium text-mv-ink-faint">ou avec votre courriel</span>
              <div className="h-px flex-1 bg-[#e8e8e6]" />
            </div>

            {/* Email Input */}
            <Field label="Adresse courriel">
              <Input
                type="email"
                placeholder="nom@restaurant.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[13.5px] placeholder:text-mv-ink-faint focus:border-mv-green/60 focus:ring-mv-green/20"
              />
            </Field>

            {/* Password Input */}
            <Field label="Mot de passe">
              <div className="flex items-center justify-between mb-1">
                <span />
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
            </Field>

            {/* Repeat Password (Signup) */}
            <AnimatePresence initial={false} mode="popLayout">
              {mode === "signup" && (
                <motion.div
                  key="confirmPwd"
                  initial={{ opacity: 0, height: 0, y: -4 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <Field label="Confirmer le mot de passe">
                    <Input
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[13.5px] focus:border-mv-green/60 focus:ring-mv-green/20"
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-600">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-mv-ink text-[13.5px] font-bold text-white transition-all hover:bg-mv-ink/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-mv-ink/30 shadow-mv-sm"
            >
              {isLoading
                ? "Traitement..."
                : mode === "login"
                  ? "Se connecter"
                  : "S'inscrire"}
            </button>

            {/* Mode Toggle Link */}
            <p className="mt-3 text-center text-[12.5px] text-mv-ink-faint">
              {mode === "login" ? "Déjà membre ?" : "Vous avez un compte ?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-mv-green-dark hover:underline focus:outline-none"
              >
                {mode === "login" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </motion.form>
        </div>

        {/* Footer Terms */}
        <p className="text-center text-[11px] text-mv-ink-faint">
          En continuant, vous acceptez nos{" "}
          <Link href="/legal/terms" className="underline hover:text-mv-ink">
            Conditions
          </Link>{" "}
          et{" "}
          <Link href="/legal/privacy" className="underline hover:text-mv-ink">
            Confidentialité
          </Link>
          .
        </p>
      </div>

      {/* ── RIGHT PANEL: Edge-to-Edge Full Screen (45-50% width) ── */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[50%]">
        <OriginRightPanel />
      </div>
    </div>
  );
}
