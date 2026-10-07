import type { Metadata } from "next";
import { LogoMark } from "@/components/shell/Logo";
import {
  MINERVA_EMAIL_PHONE,
  MINERVA_EMAIL_PHONE_TEL,
  MINERVA_EMAIL_POSTAL_ADDRESS,
} from "@/lib/email/identity";
import Link from "next/link";

export const revalidate = 86400;

type Locale = "fr" | "en";

const copy = {
  fr: {
    title: "Conditions générales de vente et d’utilisation",
    description:
      "Conditions des abonnements Minerva Flow pour les restaurants : prix, essai, renouvellement, résiliation, taxes et remboursements.",
    updated: "Dernière mise à jour : 6 octobre 2026",
    supplier: "Minerva Technologies Inc. · Adresse postale",
    intro:
      "Les présentes conditions encadrent les abonnements professionnels à Minerva Flow. En souscrivant au nom d’un restaurant ou d’une entreprise, vous confirmez être autorisé à l’engager. Le fournisseur du Service est Minerva Technologies Inc. (« Minerva »).",
    sections: [
      {
        title: "1. Service",
        paragraphs: [
          "Minerva Flow est un service logiciel en ligne destiné aux restaurants et aux entreprises de restauration. Les fonctionnalités accessibles dépendent du forfait choisi et des services tiers connectés. Le détail de l’offre retenue est présenté avant la souscription.",
        ],
      },
      {
        title: "2. Prix et taxes",
        paragraphs: [
          "Les prix sont en dollars canadiens (CAD), avant taxes. À titre de référence, le catalogue actuel indique Essentiel à 150 $ par mois ou 1 350 $ par année, et Croissance à 290 $ par mois ou 2 610 $ par année. Le forfait Marque blanche est offert à partir de 590 $ par mois sur devis. Le prix et la périodicité applicables à votre commande sont ceux affichés à la dernière étape de souscription ou inscrits dans votre devis accepté.",
          "Les taxes applicables sont ajoutées au montant dû et calculées conformément aux lois applicables. Le total et les taxes sont présentés avant la confirmation du paiement. Si le prix d’un forfait change, le nouveau prix s’applique à un renouvellement futur après avis préalable; vous pouvez résilier avant sa prise d’effet.",
        ],
      },
      {
        title: "3. Essai gratuit et début de la facturation",
        paragraphs: [
          "Les nouveaux abonnements admissibles comprennent un essai de 14 jours. La date de fin de l’essai, le forfait choisi et le montant qui sera facturé ensuite sont présentés lors de la souscription. Sauf résiliation avant la fin de l’essai, l’abonnement passe au forfait payant choisi et le paiement est demandé selon le moyen de paiement enregistré.",
        ],
      },
      {
        title: "4. Paiement et renouvellement",
        paragraphs: [
          "L’abonnement est facturé d’avance selon la périodicité choisie, mensuelle ou annuelle, et se renouvelle automatiquement pour une période équivalente jusqu’à sa résiliation. Les paiements et factures sont traités par Stripe ou par le fournisseur de paiement indiqué au moment de la commande. Vous autorisez les débits correspondant au forfait, aux taxes applicables et aux changements de forfait que vous avez confirmés.",
          "Un changement de forfait ou de périodicité peut entraîner un ajustement au prorata; le montant applicable est indiqué dans la facturation associée au changement.",
        ],
      },
      {
        title: "5. Résiliation",
        paragraphs: [
          "Le propriétaire du compte peut demander la résiliation depuis les paramètres de facturation. Elle prend effet à la fin de la période déjà payée; l’accès au Service demeure disponible jusqu’à cette date. Pour éviter le prochain renouvellement, la demande doit être faite avant la date de renouvellement affichée dans le compte.",
        ],
      },
      {
        title: "6. Remboursements",
        paragraphs: [
          "Après un débit, les sommes payées pour la période de facturation commencée ne sont pas remboursées et ne donnent pas lieu à un remboursement au prorata en cas de résiliation. Cette règle ne limite pas les droits, recours ou remboursements auxquels une personne peut avoir droit en vertu d’une disposition impérative de la loi, ni la correction d’un débit effectué par erreur.",
        ],
      },
      {
        title: "7. Comptes et données",
        paragraphs: [
          "Vous êtes responsable de l’exactitude des renseignements de compte, de la confidentialité de vos moyens d’authentification et des actions réalisées par les personnes que vous autorisez. Vous conservez vos droits sur les données que vous fournissez; Minerva les traite pour fournir, sécuriser et améliorer le Service conformément à sa politique de confidentialité.",
        ],
      },
      {
        title: "8. Programme de fidélité client",
        paragraphs: [
          "Pour les comptes de clientèle créés dans l’application mobile, les points n’ont aucune valeur monétaire, ne sont pas transférables et ne sont échangeables qu’auprès de l’établissement participant qui les a attribués. Cet établissement fixe ses règles de cumul et de récompense. La fermeture du compte peut entraîner la perte des points non utilisés, sous réserve des droits impératifs prévus par la loi.",
        ],
      },
      {
        title: "9. Services tiers, disponibilité et contact",
        paragraphs: [
          "Les intégrations (par exemple Stripe, Square et Google) restent soumises aux conditions et politiques de leurs fournisseurs. Minerva peut faire évoluer le Service et effectuer des interruptions de maintenance ou de sécurité. Pour toute question relative à un abonnement ou à ces conditions, écrivez à flow@minervaflow.app ou utilisez la page d’aide.",
        ],
      },
    ],
    help: "Aide et soutien",
    footer:
      "Les droits que la loi rend impératifs prévalent sur toute disposition contraire des présentes conditions.",
  },
  en: {
    title: "Terms of Sale and Use",
    description:
      "Minerva Flow restaurant subscription terms: pricing, trial, renewals, cancellation, taxes, and refunds.",
    updated: "Last updated: October 6, 2026",
    supplier: "Minerva Technologies Inc. · Mailing address",
    intro:
      "These terms govern professional subscriptions to Minerva Flow. By subscribing on behalf of a restaurant or business, you confirm that you are authorized to bind it. The Service is provided by Minerva Technologies Inc. (“Minerva”).",
    sections: [
      {
        title: "1. Service",
        paragraphs: [
          "Minerva Flow is an online software service for restaurants and food-service businesses. Available features depend on the selected plan and connected third-party services. The selected offer is described before you subscribe.",
        ],
      },
      {
        title: "2. Prices and taxes",
        paragraphs: [
          "Prices are in Canadian dollars (CAD), before taxes. The current catalogue lists Essentiel at $150 per month or $1,350 per year, and Croissance at $290 per month or $2,610 per year. Marque blanche starts at $590 per month by quote. The price and billing interval for your order are those shown at the final subscription step or stated in your accepted quote.",
          "Applicable taxes are added and calculated as required by law. The total and taxes are shown before payment is confirmed. If a plan price changes, the new price applies to a future renewal after prior notice; you may cancel before it takes effect.",
        ],
      },
      {
        title: "3. Free trial and start of billing",
        paragraphs: [
          "Eligible new subscriptions include a 14-day trial. The trial end date, selected plan, and amount to be charged afterward are shown when you subscribe. Unless you cancel before the trial ends, your subscription converts to the selected paid plan and payment is collected using the payment method on file.",
        ],
      },
      {
        title: "4. Payment and renewal",
        paragraphs: [
          "Your subscription is billed in advance at the selected monthly or annual interval and renews automatically for the same interval until cancelled. Payments and invoices are handled by Stripe or the payment provider identified at checkout. You authorize charges for the plan, applicable taxes, and plan changes you confirm.",
          "A plan or billing-interval change may result in a prorated adjustment; the applicable amount is shown with the related billing change.",
        ],
      },
      {
        title: "5. Cancellation",
        paragraphs: [
          "The account owner may request cancellation from billing settings. Cancellation takes effect at the end of the period already paid for, and access remains available until then. To avoid the next renewal, submit the request before the renewal date shown in your account.",
        ],
      },
      {
        title: "6. Refunds",
        paragraphs: [
          "After a charge, amounts paid for the billing period that has started are non-refundable and are not prorated when you cancel. This rule does not limit any mandatory statutory rights, remedies, or refunds, or the correction of an erroneous charge.",
        ],
      },
      {
        title: "7. Accounts and data",
        paragraphs: [
          "You are responsible for accurate account information, keeping your authentication methods secure, and actions taken by people you authorize. You retain your rights in the data you provide; Minerva processes it to provide, secure, and improve the Service in accordance with its privacy policy.",
        ],
      },
      {
        title: "8. Customer loyalty program",
        paragraphs: [
          "For customer accounts created in the mobile app, points have no monetary value, are not transferable, and may only be redeemed with the participating location that issued them. That location sets its earning and reward rules. Closing an account may result in unused points being forfeited, subject to mandatory rights under applicable law.",
        ],
      },
      {
        title: "9. Third-party services, availability, and contact",
        paragraphs: [
          "Integrations (for example, Stripe, Square, and Google) remain subject to their providers’ terms and policies. Minerva may update the Service and perform maintenance or security interruptions. For subscription or terms questions, email flow@minervaflow.app or visit the help page.",
        ],
      },
    ],
    help: "Help and support",
    footer:
      "Any rights made mandatory by law prevail over conflicting provisions in these terms.",
  },
} satisfies Record<Locale, {
  title: string;
  description: string;
  updated: string;
  supplier: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
  help: string;
  footer: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: "/legal/terms" },
    openGraph: {
      title: `Minerva Flow | ${content.title}`,
      description: content.description,
      images: ["/og.png"],
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-12 text-mv-ink">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[17px] font-bold text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </Link>

        <h1 className="mb-2 font-display text-[30px] font-bold tracking-tight text-mv-ink">
          {content.title}
        </h1>
        <p className="mb-5 text-[13px] font-medium text-mv-ink-faint">{content.updated}</p>
        <p className="mb-8 text-[14px] leading-relaxed text-mv-ink-soft">{content.intro}</p>
        <address className="mb-8 rounded-2xl border border-mv-border bg-mv-surface p-5 text-[13px] not-italic leading-relaxed text-mv-ink-soft">
          <span className="block font-semibold text-mv-ink">{content.supplier}</span>
          <span className="block">{MINERVA_EMAIL_POSTAL_ADDRESS}</span>
          <a className="mt-1 inline-block underline" href="mailto:flow@minervaflow.app">
            flow@minervaflow.app
          </a>
          <a className="mt-1 inline-block underline" href={MINERVA_EMAIL_PHONE_TEL}>
            {MINERVA_EMAIL_PHONE}
          </a>
        </address>

        <div className="space-y-8 text-[14px] leading-relaxed text-mv-ink-soft">
          {content.sections.map((section, index) => (
            <section
              key={section.title}
              className={index === 1 ? "rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm" : ""}
            >
              <h2 className="mb-3 font-display text-[18px] font-bold text-mv-ink">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {index === 8 && (
                  <p>
                    <Link href="/support" className="font-semibold text-mv-green-dark underline">
                      {content.help}
                    </Link>
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 border-t border-mv-border pt-5 text-[12px] leading-relaxed text-mv-ink-faint">
          {content.footer}
        </p>
      </div>
    </div>
  );
}
