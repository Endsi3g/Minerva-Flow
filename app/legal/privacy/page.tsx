import { LogoMark } from "@/components/shell/Logo";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-sans text-[15px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </Link>

        <h1 className="mb-1 font-display text-[26px] font-medium tracking-tight text-mv-ink">
          Politique de confidentialité
        </h1>
        <p className="mb-8 text-[12.5px] text-mv-ink-faint">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-6 text-[13.5px] leading-relaxed text-mv-ink-soft">
          <p className="rounded-lg border border-mv-border bg-mv-surface p-4 text-[12.5px]">
            Ce texte est un modèle générique fourni à titre de point de départ. Il ne constitue pas un avis
            juridique et devrait être révisé par un professionnel du droit (notamment au regard de la Loi 25 au
            Québec et des lois applicables) avant tout lancement public de l&apos;application.
          </p>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">1. Données que nous collectons</h2>
            <p>
              Informations de compte (nom, courriel, mot de passe chiffré), informations sur votre ou vos
              établissements (nom, adresse, revenus, journées de service, transactions financières, campagnes),
              et les échanges avec l&apos;assistant IA lorsque vous l&apos;utilisez.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">2. Utilisation des données</h2>
            <p>
              Les données sont utilisées pour fournir le Service (tableaux de bord, rapports, alertes,
              recommandations), améliorer ses fonctionnalités, et — lorsque vous y consentez explicitement — pour
              connecter des services tiers (Google Workspace, plateformes publicitaires) que vous configurez
              vous-même.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">3. Partage des données</h2>
            <p>
              Vos données ne sont jamais vendues. Elles peuvent être transmises à des sous-traitants
              techniques strictement nécessaires au fonctionnement du Service (hébergement, base de données,
              fournisseur d&apos;intelligence artificielle), sous contrat de confidentialité. Les liens de partage de
              rapport que vous générez vous-même exposent uniquement les données que vous choisissez d&apos;y inclure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">4. Sécurité</h2>
            <p>
              L&apos;accès aux données de chaque établissement est cloisonné par des règles d&apos;accès strictes basées
              sur votre rôle (propriétaire, gérant, employé, consultant). Les mots de passe sont chiffrés et jamais
              stockés en clair.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">5. Conservation</h2>
            <p>
              Les données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression de
              votre compte et des données associées via la page{" "}
              <Link href="/support" className="text-mv-green-dark underline underline-offset-2">
                Aide &amp; Support
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">6. Vos droits</h2>
            <p>
              Vous pouvez à tout moment accéder à vos données, les faire corriger, ou en demander la suppression,
              conformément aux lois applicables sur la protection des renseignements personnels.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">7. Contact</h2>
            <p>
              Pour toute question relative à cette politique, utilisez la page{" "}
              <Link href="/support" className="text-mv-green-dark underline underline-offset-2">
                Aide &amp; Support
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
