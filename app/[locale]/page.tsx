import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/shell/Logo";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Users,
  Utensils,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Building2,
  CalendarDays,
} from "lucide-react";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/overview");
  }

  return (
    <div className="min-h-screen bg-mv-cream text-mv-ink">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-mv-border/80 bg-mv-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={32} />
            <span className="font-sans text-[19px] font-bold text-mv-ink">
              Flow <span className="text-mv-green-dark">par Minerva</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[13.5px] font-semibold text-mv-ink-soft md:flex">
            <a href="#features" className="hover:text-mv-ink transition-colors">Fonctionnalités</a>
            <a href="#security" className="hover:text-mv-ink transition-colors">Sécurité &amp; OAuth</a>
            <Link href="/legal/privacy" className="hover:text-mv-ink transition-colors">Confidentialité</Link>
            <Link href="/legal/terms" className="hover:text-mv-ink transition-colors">Conditions</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-mv-border bg-mv-surface px-4 py-2 text-[13px] font-bold text-mv-ink shadow-mv-sm transition-all hover:bg-mv-cream-soft"
            >
              Se connecter
            </Link>
            <Link
              href="/sign-up"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-mv-green px-4 py-2 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
            >
              <span>Essai gratuit</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12 text-center lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-mv-green/30 bg-mv-green-tint px-3.5 py-1 text-[12px] font-bold text-mv-green-dark">
            <Sparkles size={14} />
            <span>Plateforme Unifiée pour Restaurants &amp; Cafés au Québec</span>
          </div>

          <h1 className="font-display text-[36px] sm:text-[48px] font-extrabold tracking-tight leading-[1.15] text-mv-ink">
            Pilotage quotidien et intelligent de votre établissement.
          </h1>

          <p className="text-[16px] sm:text-[18px] leading-relaxed text-mv-ink-soft max-w-2xl mx-auto">
            Centralisez vos revenus, vos dépenses, votre inventaire, vos horaires d&apos;équipe et vos analyses de marge dans une interface moderne et sécurisée.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/sign-up"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-mv-green px-6 py-3.5 text-[15px] font-bold text-mv-cream-soft shadow-mv-md transition-all hover:bg-mv-green-dark"
            >
              <span>Démarrer avec votre compte</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-6 py-3.5 text-[15px] font-semibold text-mv-ink transition-all hover:bg-mv-cream-soft"
            >
              Connexion Google OAuth
            </Link>
          </div>
        </div>

        {/* Hero Interactive App Card Showcase */}
        <div className="mt-12 mx-auto max-w-5xl rounded-2xl border border-mv-border bg-mv-surface p-6 sm:p-8 shadow-mv-lg text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-mv-border-soft pb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-mv-green animate-pulse" />
              <span className="font-display text-[16px] font-bold text-mv-ink">Tableau de bord opérationnel — Flow</span>
            </div>
            <span className="rounded-full bg-mv-green-tint px-3 py-1 text-[11px] font-bold text-mv-green-dark">
              Données synchronisées en direct
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
              <div className="flex items-center justify-between text-mv-ink-soft">
                <span className="text-[12px] font-semibold">Ventes du jour</span>
                <TrendingUp size={16} className="text-mv-green-dark" />
              </div>
              <p className="mt-2 text-[24px] font-bold text-mv-ink">4 290,00 $</p>
              <span className="text-[11px] font-semibold text-mv-green-dark">+18% vs semaine dernière</span>
            </div>

            <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
              <div className="flex items-center justify-between text-mv-ink-soft">
                <span className="text-[12px] font-semibold">Présence Équipe</span>
                <Users size={16} className="text-mv-green-dark" />
              </div>
              <p className="mt-2 text-[24px] font-bold text-mv-ink">8 présents</p>
              <span className="text-[11px] font-semibold text-mv-ink-soft">Quart de soir actif</span>
            </div>

            <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
              <div className="flex items-center justify-between text-mv-ink-soft">
                <span className="text-[12px] font-semibold">Intégrations POS</span>
                <Zap size={16} className="text-mv-amber" />
              </div>
              <p className="mt-2 text-[24px] font-bold text-mv-ink">Square &amp; Stripe</p>
              <span className="text-[11px] font-semibold text-mv-green-dark">Connecté &amp; Sécurisé</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16 border-t border-mv-border-soft">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-[28px] font-bold text-mv-ink">Tout ce dont votre établissement a besoin</h2>
          <p className="mt-2 text-[14.5px] text-mv-ink-soft">
            Une suite d&apos;outils conçue spécifiquement pour répondre aux exigences des restaurateurs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-[16px] text-mv-ink">Finances &amp; Journées</h3>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">
              Suivi détaillé des ventes quotidiennes, clôtures de caisse et intégration directe avec Square POS et Stripe.
            </p>
          </div>

          <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
              <Utensils size={20} />
            </div>
            <h3 className="font-bold text-[16px] text-mv-ink">Ingénierie de Menu</h3>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">
              Classification automatique de vos plats (Étoiles, Poids morts) en fonction de la marge brute et de la popularité.
            </p>
          </div>

          <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-[16px] text-mv-ink">Équipe &amp; Horaires</h3>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">
              Gestion des quarts de travail, suivi du temps et calcul automatisé de la masse salariale prévisionnelle.
            </p>
          </div>

          <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-[16px] text-mv-ink">Assistant IA Minerva</h3>
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">
              Posez vos questions en langage naturel et obtenez des réponses instantanées basées sur les chiffres réels de vos opérations.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Google OAuth Consent Section */}
      <section id="security" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-mv-green/30 bg-mv-surface p-8 lg:p-12 shadow-mv-md">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-mv-green-tint px-3.5 py-1 text-[12px] font-bold text-mv-green-dark">
              <ShieldCheck size={16} />
              <span>Authentification Sécurisée &amp; Google OAuth</span>
            </div>

            <h2 className="font-display text-[28px] font-bold text-mv-ink">
              Protection absolue de vos données d&apos;exploitation
            </h2>

            <p className="text-[14.5px] leading-relaxed text-mv-ink-soft">
              Flow par Minerva utilise les standards de sécurité industriels les plus stricts. Vos connexions par **Google OAuth** s&apos;effectuent de manière totalement chiffrée. Nous respectons la politique d&apos;utilisation des données des API Google (<strong>Google API Services User Data Policy</strong>) et la loi 25 du Québec.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[13px] font-semibold text-mv-ink">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-mv-green-dark" />
                <span>Identifiants et mots de passe chiffrés</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-mv-green-dark" />
                <span>Aucune revente de données à des tiers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-mv-green-dark" />
                <span>Cloisonnement hermétique par établissement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-mv-green-dark" />
                <span>Conforme aux règles Google Limited Use</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Official Footer for Google Verification */}
      <footer className="border-t border-mv-border bg-mv-surface py-12 px-6 text-[13px] text-mv-ink-soft">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <LogoMark size={24} />
              <span className="font-bold text-[16px] text-mv-ink">Flow par Minerva</span>
            </div>
            <p className="text-[12.5px] text-mv-ink-faint max-w-md">
              Plateforme SaaS de pilotage opérationnel pour restaurants et cafés. Québec, Canada.
            </p>
            <p className="text-[12px] text-mv-ink-faint">
              © 2026 Flow par Minerva. Tous droits réservés.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-[13px] font-semibold text-mv-ink">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Produit</span>
              <Link href="/login" className="hover:text-mv-green-dark">Se connecter</Link>
              <Link href="/sign-up" className="hover:text-mv-green-dark">Créer un compte</Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Légal &amp; Sécurité</span>
              <Link href="/legal/privacy" className="hover:text-mv-green-dark">Politique de confidentialité</Link>
              <Link href="/legal/terms" className="hover:text-mv-green-dark">Conditions d&apos;utilisation</Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Assistance</span>
              <Link href="/support" className="hover:text-mv-green-dark">Aide &amp; Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
