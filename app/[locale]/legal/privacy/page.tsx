import { LogoMark } from "@/components/shell/Logo";
import Link from "next/link";

export default function PrivacyPage() {
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
          Politique de confidentialité
        </h1>
        <p className="mb-8 text-[13px] font-medium text-mv-ink-faint">
          Dernière mise à jour : 23 juillet 2026
        </p>

        <div className="space-y-8 text-[14px] leading-relaxed text-mv-ink-soft">
          <section className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm">
            <h2 className="mb-2 font-display text-[17px] font-bold text-mv-ink">Introduction</h2>
            <p>
              Flow par Minerva (« nous », « notre » ou « le Service ») s&apos;engage à protéger les renseignements personnels de ses utilisateurs et de leurs clients. La présente Politique de confidentialité détaille les types de données que nous recueillons, la manière dont elles sont utilisées, sécurisées et conservées, conformément à la <strong>Loi 25 du Québec</strong> et aux standards internationaux de protection de la vie privée.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">1. Données que nous collectons</h2>
            <p className="mb-3">Dans le cadre de l&apos;exploitation de l&apos;application, nous pouvons recueillir :</p>
            <ul className="list-disc space-y-2 pl-6 text-mv-ink">
              <li><strong>Renseignements de compte :</strong> Nom, prénom, adresse courriel, photo de profil et rôle au sein de l&apos;établissement.</li>
              <li><strong>Données de l&apos;établissement :</strong> Nom du restaurant/café, adresse, chiffre d&apos;affaires quotidien, dépenses, stocks, inventaire et données d&apos;équipe.</li>
              <li><strong>Données de connexion et d&apos;authentification :</strong> Identifiants chiffrés et jetons OAuth (Google, Apple, Microsoft).</li>
            </ul>
          </section>

          {/* Mandatory Google Limited Use Disclosure Section for OAuth Verification */}
          <section className="rounded-2xl border border-mv-green/30 bg-mv-green-tint/40 p-6">
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-green-dark flex items-center gap-2">
              <span>2. Utilisation des données via les API Google (Google API Disclosure)</span>
            </h2>
            <p className="mb-3 text-[13.5px] leading-relaxed text-mv-ink">
              L&apos;utilisation et le transfert par Flow par Minerva vers tout autre outil des informations reçues des API Google respectent scrupuleusement la politique d&apos;utilisation des données utilisateur des services API Google (<strong>Google API Services User Data Policy</strong>), y compris les exigences d&apos;utilisation limitée (<strong>Limited Use requirements</strong>).
            </p>
            <ul className="list-disc space-y-2 pl-6 text-[13px] text-mv-ink-soft">
              <li>Les données obtenues via les API Google (telles que les informations de profil d&apos;authentification OAuth ou l&apos;intégration Google Business/Places) ne sont utilisées que pour fournir et améliorer les fonctionnalités d&apos;exploitation de votre établissement dans l&apos;application.</li>
              <li>Vos données Google ne sont jamais vendues, louées ni partagées à des tiers à des fins publicitaires ou de prospection commerciale.</li>
              <li>Les données Google ne sont aucunement utilisées pour entraîner des modèles d&apos;intelligence artificielle généraux sans votre consentement explicite.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">3. Utilisation des données</h2>
            <p className="mb-2">Nous traitons vos données exclusivement pour :</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Gérer votre compte et fournir l&apos;accès sécurisé aux tableaux de bord de votre restaurant.</li>
              <li>Générer des analyses financières, des prévisions de chiffre d&apos;affaires et des recommandations d&apos;ingénierie de menu.</li>
              <li>Assurer l&apos;envoi des notifications opérationnelles (horaires, paie, alertes de stock).</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">4. Partage et sous-traitants</h2>
            <p>
              Vos données ne sont jamais commercialisées. Elles ne sont partagées qu&apos;avec des prestataires techniques de confiance nécessaires au fonctionnement du service (tels que Supabase pour le stockage sécurisé des données et Vercel pour l&apos;hébergement), tous soumis à des exigences contractuelles strictes en matière de sécurité et de confidentialité.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">5. Droits et Responsable de la vie privée (Loi 25)</h2>
            <p className="mb-3">
              Conformément à la Loi 25 (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels au Québec), vous disposez du droit d&apos;accès, de rectification, de portabilité et de suppression de vos données personnelles.
            </p>
            <p className="rounded-xl border border-mv-border bg-mv-surface p-4 text-[13px]">
              Pour exercer vos droits ou pour toute question relative à la protection de vos renseignements personnels, contactez notre Responsable de la vie privée à : <strong className="text-mv-green-dark">privacy@minerva-flow.vercel.app</strong> ou via notre page{" "}
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
