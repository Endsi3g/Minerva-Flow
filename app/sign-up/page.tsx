"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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
      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink transition-colors hover:bg-mv-cream-soft"
    >
      {icon}
      {label}
    </button>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
    const token = params.get("inviteToken");
    if (token) setInviteToken(token);
  }, []);

  const postSignupPath = inviteToken ? `/invite/${inviteToken}` : "/overview";

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeatPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${postSignupPath}`,
          // Stashed for later redemption once a restaurant-creation flow
          // exists — see lib/data/referrals.ts for the current gap.
          data: referralCode ? { referral_code: referralCode } : undefined,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.push(postSignupPath);
        router.refresh();
      } else {
        router.push("/sign-up-success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple" | "azure") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${postSignupPath}` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card padded={false} className="w-full max-w-md overflow-hidden">
        <div>
          <form onSubmit={handleSignUp} className="flex flex-col gap-4 p-8">
            <div>
              <h1 className="font-display text-[22px] font-medium text-mv-ink">
                Créer un compte
              </h1>
              <p className="mt-1 text-[13px] text-mv-ink-soft">
                Démarrez votre cockpit de revenus Minerva.
              </p>
            </div>

            <Field label="Email">
              <Input
                type="email"
                placeholder="vous@restaurant.fr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Mot de passe">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <Input
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </Field>

            {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

            <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
              {isLoading ? "Création…" : "Créer le compte"}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-mv-border-soft" />
              <span className="text-[11.5px] text-mv-ink-faint">ou continuer avec</span>
              <div className="h-px flex-1 bg-mv-border-soft" />
            </div>

            <div className="flex gap-2">
              <OAuthButton
                label="Google"
                onClick={() => handleOAuth("google")}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.85z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                }
              />
              <OAuthButton
                label="Apple"
                onClick={() => handleOAuth("apple")}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.365 1.43c0 1.14-.462 2.15-1.213 2.9-.83.85-2.18 1.51-3.37 1.42-.15-1.09.44-2.24 1.16-2.98.82-.86 2.23-1.5 3.42-1.34zM20.6 17.36c-.51 1.18-.76 1.7-1.42 2.75-.92 1.46-2.22 3.28-3.83 3.29-1.43.02-1.8-.93-3.73-.92-1.94.01-2.34.94-3.77.92-1.61-.02-2.84-1.66-3.76-3.12C1.62 16.9.94 12.85 2.4 10.09c.99-1.9 2.79-3.1 4.73-3.13 1.5-.02 2.9.99 3.82.99.92 0 2.61-1.22 4.41-1.04.75.03 2.85.3 4.2 2.26-.11.07-2.5 1.44-2.47 4.31.03 3.43 3.03 4.57 3.06 4.58-.02.07-.48 1.6-1.55 3.3z" />
                  </svg>
                }
              />
              <OAuthButton
                label="Microsoft"
                onClick={() => handleOAuth("azure")}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
                    <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
                    <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
                    <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
                  </svg>
                }
              />
            </div>

            <p className="text-center text-[12.5px] text-mv-ink-faint">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold text-mv-green-dark hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </Card>

      <p className="mt-6 max-w-md text-center text-[12px] leading-relaxed text-mv-ink-faint">
        En continuant, vous acceptez nos{" "}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-mv-ink">
          Conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-mv-ink">
          Politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
