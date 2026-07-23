"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { OtpInput } from "@/components/auth/OtpInput";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, Users, PackageCheck } from "lucide-react";
import { Google, Apple, Microsoft } from "@/components/ui/BrandIcons";

function OAuthButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink transition-all hover:bg-mv-cream-soft focus:outline-none focus:ring-2 focus:ring-mv-green/20"
    >
      {icon}
      {label}
    </button>
  );
}

export function AuthCard({ initialMode }: { initialMode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
    if (normalized.includes("invalid login credentials")) {
      return t("errorInvalidCredentials");
    }
    if (
      normalized.includes("already registered") ||
      normalized.includes("user already registered") ||
      normalized.includes("already exists")
    ) {
      return t("errorAlreadyRegistered");
    }
    if (normalized.includes("token has expired") || normalized.includes("invalid token")) {
      return "Le code OTP renseigné est invalide ou expiré.";
    }
    return msg;
  };

  async function handleSendOtp() {
    if (!email) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${localizedPostAuthPath}`,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      setSuccessMsg("Un code de vérification à 6 chiffres vous a été envoyé par courriel.");
    } catch (err) {
      setError(err instanceof Error ? mapErrorMessage(err.message) : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(codeToVerify?: string) {
    const token = codeToVerify || otpCode;
    if (!token || token.length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      if (data.user) {
        posthog.identify(data.user.id, { email: data.user.email });
        posthog.capture("user_logged_in", { method: "otp" });
      }
      router.push(postAuthPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? mapErrorMessage(err.message) : t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (authMethod === "otp") {
      if (otpSent) {
        await handleVerifyOtp();
      } else {
        await handleSendOtp();
      }
      return;
    }

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
        if (password !== repeatPassword) {
          throw new Error(t("errorPasswordMismatch"));
        }
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

  async function handleOAuth(provider: "google" | "apple" | "azure") {
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
    setSuccessMsg(null);
    setOtpSent(false);
    const newMode = mode === "login" ? "signup" : "login";
    setMode(newMode);
    const href = getPathname({ href: newMode === "login" ? "/login" : "/sign-up", locale });
    window.history.pushState(null, "", href);
  }

  return (
    <div className="min-h-screen w-full bg-mv-cream text-mv-ink">
      {/* Top Bar Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <span className="font-sans text-[18px] font-bold text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>
        <div className="hidden items-center gap-6 text-[13px] font-semibold text-mv-ink-soft md:flex">
          <Link href="/legal/terms" className="hover:text-mv-ink">Conditions</Link>
          <Link href="/legal/privacy" className="hover:text-mv-ink">Confidentialité</Link>
          <Link href="/support" className="hover:text-mv-ink">Assistance</Link>
        </div>
      </header>

      {/* Main 2-Column Section */}
      <main className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-12 px-6 py-6 lg:flex-row lg:items-stretch lg:py-12">
        {/* Left Column: Form Card */}
        <div className="flex w-full flex-col justify-center lg:w-[480px]">
          <Card padded={false} className="w-full border-mv-border bg-mv-surface shadow-mv-md">
            <form onSubmit={handleAuth} className="flex flex-col gap-5 p-8">
              <div>
                <h1 className="font-display text-[24px] font-bold tracking-tight text-mv-ink">
                  {mode === "login" ? "Connexion à votre espace" : "Créer un compte Minerva"}
                </h1>
                <p className="mt-1 text-[13.5px] text-mv-ink-soft">
                  {mode === "login"
                    ? "Pilotez l'exploitation de vos établissements en toute simplicité."
                    : "Rejoignez la plateforme de gestion unifiée pour restaurants et cafés."}
                </p>
              </div>

              {/* OAuth Buttons */}
              <div className="flex gap-2">
                <OAuthButton
                  label="Google"
                  onClick={() => handleOAuth("google")}
                  icon={<Google size={16} />}
                />
                <OAuthButton
                  label="Apple"
                  onClick={() => handleOAuth("apple")}
                  icon={<Apple size={16} />}
                />
                <OAuthButton
                  label="Microsoft"
                  onClick={() => handleOAuth("azure")}
                  icon={<Microsoft size={16} />}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-mv-border-soft" />
                <span className="text-[11.5px] font-medium text-mv-ink-faint">ou avec votre courriel</span>
                <div className="h-px flex-1 bg-mv-border-soft" />
              </div>

              {/* Mode Switcher: Password vs OTP */}
              {mode === "login" && (
                <div className="flex rounded-lg border border-mv-border bg-mv-cream-soft p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("password");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-all ${
                      authMethod === "password"
                        ? "bg-mv-surface text-mv-ink shadow-mv-sm"
                        : "text-mv-ink-soft hover:text-mv-ink"
                    }`}
                  >
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("otp");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-all ${
                      authMethod === "otp"
                        ? "bg-mv-surface text-mv-ink shadow-mv-sm"
                        : "text-mv-ink-soft hover:text-mv-ink"
                    }`}
                  >
                    Code OTP / Magique
                  </button>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-4">
                <Field label={t("emailLabel")}>
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                {authMethod === "password" ? (
                  <>
                    <Field label={t("passwordLabel")}>
                      <div className="flex items-center justify-between">
                        <span />
                        {mode === "login" && (
                          <Link
                            href="/forgot-password"
                            className="text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                          >
                            {t("forgotPasswordLink")}
                          </Link>
                        )}
                      </div>
                      <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>

                    <AnimatePresence initial={false} mode="popLayout">
                      {mode === "signup" && (
                        <motion.div
                          key="repeatPassword"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Field label={t("confirmPasswordLabel")}>
                            <Input
                              type="password"
                              required
                              value={repeatPassword}
                              onChange={(e) => setRepeatPassword(e.target.value)}
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  /* OTP Mode Field */
                  <div className="space-y-3 pt-1">
                    {otpSent ? (
                      <div className="space-y-3">
                        <p className="text-[12.5px] font-medium text-mv-ink-soft">
                          Saisissez le code à 6 chiffres reçu sur <strong className="text-mv-ink">{email}</strong> :
                        </p>
                        <OtpInput
                          length={6}
                          onComplete={(code) => {
                            setOtpCode(code);
                            handleVerifyOtp(code);
                          }}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                          className="text-[11.5px] font-semibold text-mv-green-dark hover:underline focus:outline-none"
                        >
                          Renvoyer un nouveau code
                        </button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-mv-ink-soft">
                        Nous vous enverrons un code de connexion sécurisé à 6 chiffres par courriel (aucun mot de passe requis).
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {error && <p className="text-[12.5px] font-medium text-mv-red">{error}</p>}
              {successMsg && <p className="text-[12.5px] font-medium text-mv-green-dark">{successMsg}</p>}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  "Traitement en cours..."
                ) : authMethod === "otp" ? (
                  otpSent ? (
                    "Vérifier le code →"
                  ) : (
                    "Envoyer le code OTP →"
                  )
                ) : mode === "login" ? (
                  t("submitLogin")
                ) : (
                  t("submitSignup")
                )}
              </Button>

              {/* Toggle Mode Link */}
              <p className="text-center text-[12.5px] text-mv-ink-faint">
                {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-mv-green-dark hover:underline focus:outline-none"
                >
                  {mode === "login" ? t("createAccount") : t("submitLogin")}
                </button>
              </p>
            </form>
          </Card>
        </div>

        {/* Right Column: App Interactive Live Preview (Minerva Theme) */}
        <div className="hidden flex-1 lg:flex flex-col justify-center">
          <div className="relative overflow-hidden rounded-2xl border border-mv-border bg-mv-surface p-8 shadow-mv-md">
            {/* Background Decorative Blur Tints */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-mv-green-tint/60 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-mv-lime-tint/60 blur-3xl" />

            <div className="relative space-y-6">
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between border-b border-mv-border-soft pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-mv-green animate-pulse" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-mv-green-dark">
                    Plateforme Minerva Live
                  </span>
                </div>
                <span className="rounded-full bg-mv-green-tint px-3 py-1 text-[11px] font-semibold text-mv-green-dark">
                  Établissement connecté
                </span>
              </div>

              {/* Grid Widgets Preview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
                  <div className="flex items-center justify-between text-mv-ink-soft">
                    <span className="text-[12px] font-semibold">Revenu du jour</span>
                    <TrendingUp size={16} className="text-mv-green-dark" />
                  </div>
                  <p className="mt-2 text-[22px] font-bold text-mv-ink">3 840,50 $</p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-mv-green-dark">
                    +14.2% vs semaine passée
                  </span>
                </div>

                <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
                  <div className="flex items-center justify-between text-mv-ink-soft">
                    <span className="text-[12px] font-semibold">Équipe en quart</span>
                    <Users size={16} className="text-mv-green-dark" />
                  </div>
                  <p className="mt-2 text-[22px] font-bold text-mv-ink">6 présents</p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-mv-ink-soft">
                    Service du soir (17h - 23h)
                  </span>
                </div>
              </div>

              {/* AI Assistant Live Prompt Card */}
              <div className="rounded-xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-mv-green-dark">
                  <Sparkles size={16} />
                  <span>Assistant IA Minerva</span>
                </div>
                <div className="mt-3 rounded-lg bg-mv-green-tint/50 p-3 text-[13px] leading-relaxed text-mv-ink">
                  "L'ingénierie de menu indique que le <strong>Tartare de Saumon</strong> est votre plat avec la plus forte marge (+68%)."
                </div>
              </div>

              {/* Feature Points */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-[12px] text-mv-ink-soft">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-mv-green-dark" />
                  <span>Point de vente & Square</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-mv-green-dark" />
                  <span>Paiements Stripe Connect</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-mv-green-dark" />
                  <span>Horaires & Paie d'équipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-mv-green-dark" />
                  <span>Fidélisation & QR Codes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-[12px] text-mv-ink-faint">
        © 2026 Flow par Minerva. Gestion opérationnelle pour restaurants et cafés au Québec.
      </footer>
    </div>
  );
}
