import { LogoMark } from "@/components/shell/Logo";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-mv-cream px-6 py-12 text-mv-ink">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[17px] font-bold text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </Link>

        <h1 className="mb-2 font-display text-[30px] font-bold tracking-tight text-mv-ink">
          Conditions d&apos;utilisation
        </h1>
        <p className="mb-8 text-[13px] font-medium text-mv-ink-faint">
          Dernière mise à jour : 23 juillet 2026
        </p>

        <div className="space-y-8 text-[14px] leading-relaxed text-mv-ink-soft">
          <section className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm">
            <h2 className="mb-2 font-display text-[17px] font-bold text-mv-ink">1. Acceptation des conditions</h2>
            <p>
              En créant un compte ou en accédant à l&apos;application Flow par Minerva (« le Service »), vous acceptez pleinement et sans réserve les présentes Conditions d&apos;utilisation. Si vous agissez au nom d&apos;un restaurant, café ou établissement commercial, vous garantissez disposer de l&apos;autorité nécessaire pour engager cet établissement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">2. Description du Service</h2>
            <p>
              Flow par Minerva est une plateforme SaaS de gestion opérationnelle et financière dédiée aux restaurants et cafés au Québec. Le Service permet le suivi du chiffre d&apos;affaires, des dépenses, de l&apos;inventaire, de la gestion de l&apos;équipe, de l&apos;ingénierie de menu, ainsi que l&apos;intégration de services tiers (tels que Square POS, Stripe Connect et Google Business).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">3. Compte, Sécurité et Authentification</h2>
            <p>
              Vous êtes responsable de maintenir la sécurité de vos identifiants de connexion et de votre compte (mot de passe ou authentification Google OAuth). Toute action effectuée depuis votre compte est réputée avoir été effectuée par vous ou vos délégués autorisés.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">4. Propriété des données</h2>
            <p>
              L&apos;exploitant conserve l&apos;entière propriété de toutes les données d&apos;exploitation saisies dans le Service (chiffre d&apos;affaires, menus, listes de clients, données d&apos;équipe). Flow par Minerva traite ces données uniquement dans la mesure nécessaire à la prestation des services souscrits.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">5. Intégrations et Services Tiers</h2>
            <p>
              Le Service permet de vous connecter à des services tiers (notamment Google APIs, Square, Stripe). L&apos;utilisation de ces intégrations reste soumise aux conditions et règles de confidentialité de chacun de ces fournisseurs tiers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">6. Modifications et Contact</h2>
            <p>
              Nous nous réservons le droit de modifier les présentes conditions. Toute révision majeure sera notifiée dans l&apos;application. Pour toute question, veuillez nous contacter sur la page{" "}
              <Link href="/support" className="text-mv-green-dark underline font-semibold">
                Aide &amp; Support
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
