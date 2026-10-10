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
    title: "Conditions d’utilisation",
    description:
      "Conditions d’utilisation de Minerva Flow pour les restaurants : période de développement gratuite, rémunération à la performance, mesure, facturation, résiliation et taxes.",
    updated: "Dernière mise à jour : 10 octobre 2026",
    supplier: "Minerva Technologies Inc. · Adresse postale",
    intro:
      "Les présentes conditions encadrent l’utilisation professionnelle de Minerva Flow. En ouvrant un compte au nom d’un restaurant ou d’une entreprise, vous confirmez être autorisé à l’engager. Le fournisseur du Service est Minerva Technologies Inc. (« Minerva »).",
    sections: [
      {
        title: "1. Service",
        paragraphs: [
          "Minerva Flow est un service logiciel en ligne destiné aux restaurants et aux entreprises de restauration. Les fonctionnalités accessibles dépendent des services tiers connectés (caisse, paiements, cartes de fidélité). L’offre qui s’applique à votre établissement vous est présentée par écrit avant toute facturation.",
        ],
      },
      {
        title: "2. Rémunération à la performance",
        paragraphs: [
          "Minerva Flow n’a pas de forfait ni d’abonnement fixe. Minerva est rémunérée uniquement par un pourcentage des revenus additionnels mesurés que le programme de fidélité génère pour votre établissement, selon le pourcentage et la méthode de mesure indiqués dans votre offre acceptée par écrit. S’il n’y a aucun revenu additionnel mesuré pour une période, aucun montant n’est dû pour cette période.",
          "Aucun résultat n’est garanti. Les ordres de grandeur présentés dans nos documents (par exemple « jusqu’à 5 à 10 % de revenus selon le panier ») sont des estimations fondées sur des hypothèses; ils ne constituent ni une promesse ni une moyenne. Vos résultats dépendent notamment de votre clientèle, de votre panier moyen et de l’adoption du programme par vos clients.",
          "Les montants sont en dollars canadiens (CAD), avant taxes. Les taxes applicables sont ajoutées conformément à la loi.",
        ],
      },
      {
        title: "3. Période de développement gratuite",
        paragraphs: [
          "Pendant la période de développement, l’accès au Service est gratuit. Aucun moyen de paiement n’est demandé et aucune facturation ne commence automatiquement.",
          "Avant toute première facturation, Minerva vous envoie un avis écrit d’au moins 30 jours qui précise le pourcentage, la méthode de mesure et la date de début. La facturation ne commence que si vous acceptez expressément l’offre; sans acceptation, le Service demeure gratuit ou prend fin, selon ce que Minerva vous aura indiqué dans l’avis.",
        ],
      },
      {
        title: "4. Mesure et facturation",
        paragraphs: [
          "Les revenus additionnels sont mesurés à partir des données du Service (commandes, visites créditées, passages en caisse liés au programme) en comparant l’activité des clients membres à une base de référence décrite dans votre offre. Un relevé mensuel présente les chiffres utilisés et le calcul du montant dû.",
          "Vous pouvez contester un relevé dans les 30 jours suivant sa réception; Minerva examine la contestation et corrige toute erreur. Les paiements et factures sont traités par le fournisseur de paiement indiqué dans votre offre. Vous autorisez uniquement les débits correspondant à un relevé que vous avez reçu.",
        ],
      },
      {
        title: "5. Résiliation",
        paragraphs: [
          "Vous pouvez mettre fin à l’utilisation du Service en tout temps, depuis les paramètres du compte ou par courriel à flow@minervaflow.app, sans pénalité ni frais de résiliation. La résiliation prend effet à la fin du mois en cours; les revenus additionnels mesurés jusqu’à cette date demeurent facturables selon le relevé correspondant.",
        ],
      },
      {
        title: "6. Corrections et remboursements",
        paragraphs: [
          "Un montant facturé par erreur ou à la suite d’une mesure erronée est corrigé ou remboursé. Cette règle ne limite pas les droits, recours ou remboursements auxquels une personne peut avoir droit en vertu d’une disposition impérative de la loi.",
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
          "Les intégrations (par exemple Stripe, Square et Google) restent soumises aux conditions et politiques de leurs fournisseurs. Minerva peut faire évoluer le Service et effectuer des interruptions de maintenance ou de sécurité. Pour toute question relative à la facturation ou à ces conditions, écrivez à flow@minervaflow.app ou utilisez la page d’aide.",
        ],
      },
    ],
    help: "Aide et soutien",
    footer:
      "Les droits que la loi rend impératifs prévalent sur toute disposition contraire des présentes conditions.",
  },
  en: {
    title: "Terms of Use",
    description:
      "Minerva Flow terms of use for restaurants: free development period, performance-based fees, measurement, billing, cancellation, and taxes.",
    updated: "Last updated: October 10, 2026",
    supplier: "Minerva Technologies Inc. · Mailing address",
    intro:
      "These terms govern professional use of Minerva Flow. By opening an account on behalf of a restaurant or business, you confirm that you are authorized to bind it. The Service is provided by Minerva Technologies Inc. (“Minerva”).",
    sections: [
      {
        title: "1. Service",
        paragraphs: [
          "Minerva Flow is an online software service for restaurants and food-service businesses. Available features depend on the connected third-party services (point of sale, payments, loyalty cards). The offer that applies to your location is presented to you in writing before any billing.",
        ],
      },
      {
        title: "2. Performance-based fees",
        paragraphs: [
          "Minerva Flow has no fixed plan or subscription. Minerva is paid only a percentage of the measured additional revenue the loyalty program generates for your location, at the percentage and under the measurement method set out in your offer accepted in writing. If no additional revenue is measured for a period, nothing is owed for that period.",
          "No result is guaranteed. Orders of magnitude shown in our materials (for example “up to 5–10% additional revenue depending on basket size”) are estimates based on assumptions; they are neither a promise nor an average. Your results depend on factors such as your customers, your average basket, and how many customers adopt the program.",
          "Amounts are in Canadian dollars (CAD), before taxes. Applicable taxes are added as required by law.",
        ],
      },
      {
        title: "3. Free development period",
        paragraphs: [
          "During the development period, access to the Service is free. No payment method is requested and no billing starts automatically.",
          "Before any first billing, Minerva sends you written notice at least 30 days in advance stating the percentage, the measurement method, and the start date. Billing starts only if you expressly accept the offer; without acceptance, the Service stays free or ends, as Minerva states in the notice.",
        ],
      },
      {
        title: "4. Measurement and billing",
        paragraphs: [
          "Additional revenue is measured from Service data (orders, credited visits, point-of-sale transactions linked to the program) by comparing the activity of member customers with a baseline described in your offer. A monthly statement shows the figures used and how the amount due is calculated.",
          "You may dispute a statement within 30 days of receiving it; Minerva reviews the dispute and corrects any error. Payments and invoices are handled by the payment provider named in your offer. You authorize only charges that match a statement you have received.",
        ],
      },
      {
        title: "5. Cancellation",
        paragraphs: [
          "You may stop using the Service at any time, from account settings or by email to flow@minervaflow.app, with no penalty or cancellation fee. Cancellation takes effect at the end of the current month; additional revenue measured up to that date remains billable under the corresponding statement.",
        ],
      },
      {
        title: "6. Corrections and refunds",
        paragraphs: [
          "An amount billed in error or following an erroneous measurement is corrected or refunded. This rule does not limit any mandatory statutory rights, remedies, or refunds.",
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
          "Integrations (for example, Stripe, Square, and Google) remain subject to their providers’ terms and policies. Minerva may update the Service and perform maintenance or security interruptions. For billing or terms questions, email flow@minervaflow.app or visit the help page.",
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
            <span className="italic text-mv-ink">Minerva Flow</span>
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
