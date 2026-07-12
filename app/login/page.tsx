import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import Link from "next/link";

function DoorIllustration() {
  return (
    <svg width="120" height="150" viewBox="0 0 180 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="200" width="144" height="4" rx="2" fill="var(--mv-border)" />
      <rect x="34" y="14" width="86" height="188" rx="3" fill="var(--mv-surface)" stroke="var(--mv-ink)" strokeWidth="2" />
      <path d="M120 16 C120 16 158 20 160 100 C162 160 128 198 120 200 L120 16 Z" fill="var(--mv-ink)" />
      <path
        d="M126 26 C126 26 154 32 156 100 C158 152 132 188 126 192 L126 26 Z"
        fill="url(#doorNight)"
      />
      <circle cx="140" cy="60" r="1.6" fill="var(--mv-lime)" />
      <circle cx="148" cy="90" r="1.2" fill="var(--mv-lime)" />
      <circle cx="136" cy="120" r="1.8" fill="var(--mv-lime)" />
      <circle cx="146" cy="150" r="1.2" fill="var(--mv-lime)" />
      <circle cx="139" cy="42" r="1.2" fill="var(--mv-cream-soft)" />
      <circle cx="98" cy="108" r="2.5" fill="var(--mv-ink)" />
      <defs>
        <linearGradient id="doorNight" x1="126" y1="26" x2="156" y2="192" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mv-green-darker)" />
          <stop offset="1" stopColor="var(--mv-ink)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function OAuthButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Link
      href="/onboarding"
      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-mv-border bg-mv-surface text-[13px] font-semibold text-mv-ink transition-colors hover:bg-mv-cream-soft"
    >
      {icon}
      {label}
    </Link>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card padded={false} className="w-full max-w-3xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          <form
            action="/onboarding"
            className="flex flex-col justify-center gap-4 p-8"
          >
            <div>
              <h1 className="font-display text-[22px] font-medium text-mv-ink">
                Bon retour
              </h1>
              <p className="mt-1 text-[13px] text-mv-ink-soft">
                Connectez-vous à votre cockpit Minerva Flow.
              </p>
            </div>

            <Field label="Email">
              <Input type="email" placeholder="vous@restaurant.fr" required />
            </Field>
            <Field label="Mot de passe">
              <Input type="password" required />
            </Field>

            <Button type="submit" className="mt-1 w-full">
              Se connecter
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-mv-border-soft" />
              <span className="text-[11.5px] text-mv-ink-faint">ou continuer avec</span>
              <div className="h-px flex-1 bg-mv-border-soft" />
            </div>

            <div className="flex gap-2">
              <OAuthButton
                label="Google"
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
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.365 1.43c0 1.14-.462 2.15-1.213 2.9-.83.85-2.18 1.51-3.37 1.42-.15-1.09.44-2.24 1.16-2.98.82-.86 2.23-1.5 3.42-1.34zM20.6 17.36c-.51 1.18-.76 1.7-1.42 2.75-.92 1.46-2.22 3.28-3.83 3.29-1.43.02-1.8-.93-3.73-.92-1.94.01-2.34.94-3.77.92-1.61-.02-2.84-1.66-3.76-3.12C1.62 16.9.94 12.85 2.4 10.09c.99-1.9 2.79-3.1 4.73-3.13 1.5-.02 2.9.99 3.82.99.92 0 2.61-1.22 4.41-1.04.75.03 2.85.3 4.2 2.26-.11.07-2.5 1.44-2.47 4.31.03 3.43 3.03 4.57 3.06 4.58-.02.07-.48 1.6-1.55 3.3z" />
                  </svg>
                }
              />
              <OAuthButton
                label="Microsoft"
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
              Pas encore de compte ? <span className="font-semibold text-mv-green-dark">Créer un compte</span>
            </p>
          </form>

          <div className="hidden flex-col items-center justify-center gap-4 border-l border-mv-border bg-mv-cream-soft p-8 md:flex">
            <DoorIllustration />
            <p className="text-center font-display text-[16px] font-medium leading-snug text-mv-ink">
              Le cockpit de revenus
              <br />
              pour restaurants et cafés
            </p>
          </div>
        </div>
      </Card>

      <p className="mt-6 max-w-md text-center text-[12px] leading-relaxed text-mv-ink-faint">
        En continuant, vous acceptez nos{" "}
        <span className="underline underline-offset-2">Conditions d&apos;utilisation</span>,{" "}
        <span className="underline underline-offset-2">Politique de confidentialité</span> et{" "}
        <span className="underline underline-offset-2">Accord de protection des données</span>.
      </p>
    </div>
  );
}
