import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/shell/Logo";

export const metadata: Metadata = {
  title: "Aide et assistance",
  description: "Contactez l’équipe Minerva Flow pour obtenir de l’aide sur votre compte, la fidélité et l’application.",
  alternates: { canonical: "/app-support" },
};

export default async function AppSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEnglish = locale === "en";

  return (
    <main className="min-h-screen bg-mv-cream px-6 py-12 text-mv-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-10 flex w-fit items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-sans text-[17px] font-bold text-mv-ink">
            Minerva Flow
          </span>
        </Link>

        <section className="rounded-3xl border border-mv-border bg-mv-surface p-7 shadow-mv-sm sm:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-mv-green-dark">
            {isEnglish ? "Minerva Flow support" : "Assistance Minerva Flow"}
          </p>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {isEnglish ? "How can we help?" : "Comment pouvons-nous vous aider ?"}
          </h1>
          <p className="mb-8 leading-relaxed text-mv-ink-soft">
            {isEnglish
              ? "Contact us about your account, restaurant access, loyalty points, rewards, orders, or a technical issue. Please include the email address on your account and a short description of the problem. Do not include your password or a sign-in code."
              : "Écrivez-nous pour toute question sur votre compte, l’accès à un restaurant, vos points, vos récompenses, vos commandes ou un problème technique. Indiquez l’adresse courriel de votre compte et décrivez brièvement le problème. N’envoyez jamais votre mot de passe ni un code de connexion."}
          </p>

          <a
            href="mailto:support@minervaflow.app"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-mv-green-dark px-5 py-3 font-semibold text-white transition hover:bg-mv-green"
          >
            {isEnglish ? "Email support" : "Écrire au soutien"}
          </a>
          <p className="mt-3 text-sm text-mv-ink-soft">support@minervaflow.app</p>
          <p className="mt-2 text-sm text-mv-ink-soft">
            <a href="tel:+15144515232" className="underline underline-offset-4">(514) 451-5232</a>
            <br />
            {isEnglish
              ? "Minerva Technologies Inc. · 367 rue Lberge, Repentigny, Québec J6A 4C2, Canada"
              : "Minerva Technologies Inc. · 367 rue Lberge, Repentigny (Québec) J6A 4C2, Canada"}
          </p>

          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 border-t border-mv-border pt-5 text-sm">
            <Link href="/legal/privacy" className="text-mv-green-dark underline underline-offset-4">
              {isEnglish ? "Privacy policy" : "Politique de confidentialité"}
            </Link>
            <Link href="/legal/terms" className="text-mv-green-dark underline underline-offset-4">
              {isEnglish ? "Terms of service" : "Conditions d’utilisation"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
