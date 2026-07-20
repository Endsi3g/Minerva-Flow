import { LogoMark } from "@/components/shell/Logo";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-sans text-[15px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </Link>

        <h1 className="mb-1 font-display text-[26px] font-medium tracking-tight text-mv-ink">
          Conditions d&apos;utilisation
        </h1>
        <p className="mb-8 text-[12.5px] text-mv-ink-faint">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-6 text-[13.5px] leading-relaxed text-mv-ink-soft">
          <p className="rounded-lg border border-mv-border bg-mv-surface p-4 text-[12.5px]">
            Ce texte est un modèle générique fourni à titre de point de départ. Il ne constitue pas un avis
            juridique et devrait être révisé par un professionnel du droit avant tout lancement public de
            l&apos;application.
          </p>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">1. Acceptation des conditions</h2>
            <p>
              En créant un compte ou en utilisant Flow par Minerva (« le Service »), vous acceptez d&apos;être lié par
              les présentes conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas
              utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">2. Description du service</h2>
            <p>
              Flow par Minerva est un outil de gestion destiné aux exploitants de restaurants et cafés, permettant de
              suivre les revenus, les journées de service, les campagnes marketing, l&apos;équipe et de générer des
              rapports et recommandations, y compris assistés par intelligence artificielle.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">3. Comptes et sécurité</h2>
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée sous
              votre compte. Informez-nous immédiatement de toute utilisation non autorisée.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">4. Contenu et données</h2>
            <p>
              Vous conservez la propriété des données que vous saisissez dans le Service (revenus, journées,
              campagnes, etc.). Vous nous accordez le droit de les traiter dans le seul but de fournir et
              d&apos;améliorer le Service, y compris via des fonctionnalités d&apos;intelligence artificielle.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">5. Utilisation acceptable</h2>
            <p>
              Vous vous engagez à ne pas utiliser le Service à des fins illégales, à ne pas tenter d&apos;accéder à
              des données d&apos;autres établissements sans autorisation, et à ne pas perturber le fonctionnement du
              Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">6. Résiliation</h2>
            <p>
              Vous pouvez cesser d&apos;utiliser le Service à tout moment. Nous nous réservons le droit de suspendre
              ou résilier un compte en cas de violation manifeste des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">7. Limitation de responsabilité</h2>
            <p>
              Le Service est fourni « tel quel ». Dans la mesure permise par la loi, nous ne pourrons être tenus
              responsables des pertes indirectes découlant de son utilisation, y compris les décisions d&apos;affaires
              prises sur la base des rapports ou recommandations générés.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">8. Modifications</h2>
            <p>
              Nous pouvons modifier ces conditions ponctuellement. Les changements substantiels vous seront
              communiqués dans l&apos;application.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[16px] font-medium text-mv-ink">9. Contact</h2>
            <p>
              Pour toute question relative à ces conditions, utilisez la page{" "}
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
