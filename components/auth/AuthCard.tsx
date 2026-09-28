"use client";

import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState, useEffect, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Google, Apple } from "@/components/ui/BrandIcons";
import { AuthShell } from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";
import { signUpAction, checkEmailAuthMethodAction } from "@/app/[locale]/sign-up/actions";

type AuthParams = {
  referralCode: string | null;
  ambassadorCode: string | null;
  ambassadorLinkSlug: string | null;
  inviteToken: string | null;
  workspaceInviteToken: string | null;
};

function SearchParamsReader({ onParams }: { onParams: (params: AuthParams) => void }) {
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get("ref") ?? null;
  const ambassadorCode = searchParams?.get("amb") ?? null;
  const ambassadorLinkSlug = searchParams?.get("ref_link") ?? null;
  const inviteToken = searchParams?.get("inviteToken") ?? null;
  const workspaceInviteToken = searchParams?.get("wInviteToken") ?? null;

  useEffect(() => {
    onParams({ referralCode, ambassadorCode, ambassadorLinkSlug, inviteToken, workspaceInviteToken });
  }, [referralCode, ambassadorCode, ambassadorLinkSlug, inviteToken, workspaceInviteToken, onParams]);

  return null;
}

function AuthCardInner({
  initialMode,
  authParams,
}: {
  initialMode: "login" | "signup";
  authParams: AuthParams;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [productUpdatesOptIn, setProductUpdatesOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { referralCode, ambassadorCode, ambassadorLinkSlug, inviteToken, workspaceInviteToken } = authParams;

  const panelPoints = [
    { title: t("panel.point1Title"), description: t("panel.point1Description") },
    { title: t("panel.point2Title"), description: t("panel.point2Description") },
    { title: t("panel.point3Title"), description: t("panel.point3Description") },
  ];

  const postAuthPath = workspaceInviteToken
    ? `/invite/w/${workspaceInviteToken}`
    : inviteToken
      ? `/invite/${inviteToken}`
      : "/workspace";

  const localizedPostAuthPath = getPathname({ href: postAuthPath, locale });
  const postSignUpPath = workspaceInviteToken || inviteToken ? postAuthPath : "/onboarding";
  const localizedPostSignUpPath = getPathname({ href: postSignUpPath, locale });

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

  async function waitForServerSessionCookie() {
    const hasSessionCookie = () => document.cookie.split(";").some((cookie) => {
      const name = cookie.trim().split("=", 1)[0];
      return name.startsWith("sb-") && name.includes("-auth-token");
    });

    const deadline = Date.now() + 5_000;
    while (!hasSessionCookie() && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    if (!hasSessionCookie()) {
      throw new Error("La session sécurisée ne s’est pas enregistrée. Réessaie de te connecter.");
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) {
          const lowerMsg = authErr.message.toLowerCase();
          if (lowerMsg.includes("invalid login credentials")) {
            const methodCheck = await checkEmailAuthMethodAction(email);
            if (methodCheck.isOAuth && methodCheck.provider === "google") {
              setError(t("errorGoogleAccount"));
              setIsLoading(false);
              return;
            }
          }
          throw authErr;
        }
        if (data.user) {
          posthog.identify(data.user.id, { email: data.user.email });
          posthog.capture("user_logged_in", { method: "email" });
        }
        await waitForServerSessionCookie();
        // A full document navigation ensures the Supabase SSR cookie written
        // by the browser client is present before the protected route's
        // server layout evaluates onboarding state.
        window.location.assign(localizedPostAuthPath);
      } else {
        if (password !== repeatPassword) throw new Error(t("errorPasswordMismatch"));

        const signUpRes = await signUpAction({
          email,
          password,
          referralCode,
          ambassadorCode,
          ambassadorLinkSlug,
          inviteToken,
          workspaceInviteToken,
          productUpdatesOptIn,
          preferredLanguage: locale,
        });

        if (!signUpRes.success) {
          if (signUpRes.error === "ALREADY_REGISTERED") {
            throw new Error(t("errorAlreadyRegistered"));
          }
          throw new Error(signUpRes.message || t("errorGeneric"));
        }

        // Authenticate in the browser so the SDK persists its normal session
        // cookies before the protected onboarding route is requested.
        const supabase = createClient();
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;

        posthog.identify(signUpRes.userId, { email });
        posthog.capture("user_signed_up", {
          method: "email",
          has_referral: Boolean(referralCode),
          has_invite: Boolean(inviteToken || workspaceInviteToken),
        });
        await waitForServerSessionCookie();
        // signUpAction establishes the SSR cookie before it resolves.
        window.location.assign(localizedPostSignUpPath);
      }
    } catch (err) {
      posthog.captureException(err);
      setError(err instanceof Error ? mapErrorMessage(err.message) : t("errorGeneric"));
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    posthog.capture(mode === "login" ? "user_logged_in" : "user_signed_up", {
      method: provider,
      has_referral: Boolean(referralCode),
      has_invite: Boolean(inviteToken || workspaceInviteToken),
    });
    const supabase = createClient();
    const oauthNextPath = mode === "signup" && ambassadorCode
      ? `${localizedPostAuthPath}?flow_amb=${encodeURIComponent(ambassadorCode)}${ambassadorLinkSlug ? `&flow_amb_link=${encodeURIComponent(ambassadorLinkSlug)}` : ""}`
      : localizedPostAuthPath;
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(oauthNextPath)}` },
    });
    if (authErr) {
      posthog.captureException(authErr);
      setError(mapErrorMessage(authErr.message));
    }
  }

  function toggleMode(newMode: "login" | "signup") {
    setError(null);
    setMode(newMode);
    setProductUpdatesOptIn(false);
    const href = getPathname({ href: newMode === "login" ? "/login" : "/sign-up", locale });
    window.history.pushState(null, "", href);
  }

  return (
    <AuthShell
      step={mode === "signup" ? { current: 1, total: 2, label: "Compte" } : undefined}
      panelKey={mode}
      panelHeadline={mode === "login" ? t("panel.loginHeadline") : t("panel.signupHeadline")}
      panelPoints={panelPoints}
      footer={
        <p className="text-center text-[11.5px] leading-relaxed text-mv-ink-faint">
          {t.rich("termsAgreement", {
            terms: (chunks) => <Link href="/legal/terms" className="font-medium text-mv-ink-soft underline underline-offset-2 hover:text-mv-ink">{chunks}</Link>,
            privacy: (chunks) => <Link href="/legal/privacy" className="font-medium text-mv-ink-soft underline underline-offset-2 hover:text-mv-ink">{chunks}</Link>,
          })}
        </p>
      }
    >
      {/* Mode switcher — stays put across the crossfade below, so the click
          target itself never disappears mid-transition. */}
      <div className="flex rounded-xl border border-mv-border bg-mv-cream-soft p-1">
        <button
          type="button"
          onClick={() => toggleMode("login")}
          className={cn(
            "flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all",
            mode === "login" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink-soft"
          )}
        >
          {t("modeLogin")}
        </button>
        <button
          type="button"
          onClick={() => toggleMode("signup")}
          className={cn(
            "flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all",
            mode === "signup" ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink-soft"
          )}
        >
          {t("modeSignup")}
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <h1 className="mt-6 font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
            {mode === "login" ? t("login.title") : t("signup.title")}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
            {mode === "login"
              ? t("login.subtitle")
              : t("signup.subtitle")}
          </p>

          {/* Social OAuth (Apple & Google) */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink shadow-mv-sm transition-colors hover:bg-mv-cream-soft focus:outline-none focus:ring-2 focus:ring-mv-green/20"
            >
              <Apple size={16} />
              <span>{t("continueWithApple")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink shadow-mv-sm transition-colors hover:bg-mv-cream-soft focus:outline-none focus:ring-2 focus:ring-mv-green/20"
            >
              <Google size={16} />
              <span>{t("continueWithGoogle")}</span>
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-mv-border" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-mv-ink-faint">{t("orContinueWithEmail")}</span>
            <div className="h-px flex-1 bg-mv-border" />
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">{t("emailLabel")}</label>
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11.5px] font-semibold text-mv-ink-soft">{t("passwordLabel")}</label>
                {mode === "login" && (
                  <Link href="/forgot-password" className="text-[11.5px] font-semibold text-mv-green-dark hover:underline">
                    {t("forgotShort")}
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
                <label className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">{t("confirmPasswordLabel")}</label>
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

            {mode === "signup" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-mv-border bg-mv-cream-soft p-3.5">
                <input
                  type="checkbox"
                  checked={productUpdatesOptIn}
                  onChange={(event) => setProductUpdatesOptIn(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-mv-green"
                />
                <span className="text-[12px] leading-5 text-mv-ink-soft">
                  <span className="block font-semibold text-mv-ink">{t("productUpdatesConsentLabel")}</span>
                  {t("productUpdatesConsentDescription")}
                </span>
              </label>
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
                  <span>{t("submitting")}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? t("submitLogin") : t("continueSignup")}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-center gap-2 border-t border-mv-border-soft pt-5 text-[11px] text-mv-ink-faint">
        <ShieldCheck size={13} className="text-mv-green-dark" />
        <span>{t("securityNote")}</span>
      </div>
    </AuthShell>
  );
}

export function AuthCard({ initialMode }: { initialMode: "login" | "signup" }) {
  const [params, setParams] = useState<AuthParams>({
    referralCode: null,
    ambassadorCode: null,
    ambassadorLinkSlug: null,
    inviteToken: null,
    workspaceInviteToken: null,
  });

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsReader onParams={setParams} />
      </Suspense>
      <AuthCardInner initialMode={initialMode} authParams={params} />
    </>
  );
}
