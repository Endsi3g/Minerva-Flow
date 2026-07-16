"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import {
  Download,
  Rocket,
  LayoutGrid,
  CalendarCheck2,
  Wallet,
  Megaphone,
  Users,
  LineChart,
  Sparkles,
  Bell,
  CircleHelp,
  Plug,
} from "lucide-react";
import Link from "next/link";

type Section = {
  icon: typeof Rocket;
  title: string;
  body: React.ReactNode;
};

const sections: Section[] = [
  {
    icon: Rocket,
    title: "Démarrer en 5 minutes",
    body: (
      <ol className="list-decimal space-y-2 pl-4">
        <li>
          Ouvrez le menu en haut de la barre latérale (le nom de votre établissement) et cliquez sur{" "}
          <strong>« Gérer le workspace »</strong> pour renseigner le vrai nom, l&apos;adresse et le fuseau
          horaire de votre restaurant.
        </li>
        <li>
          Allez dans <Link href="/collaborateurs" className="text-mv-green-dark underline">Collaborateurs</Link>{" "}
          pour inviter votre équipe : générez un lien d&apos;invitation et partagez-le par SMS ou WhatsApp.
        </li>
        <li>
          Enregistrez votre première <Link href="/days" className="text-mv-green-dark underline">journée de service</Link> — c&apos;est
          la donnée de base qui alimente tous les rapports.
        </li>
        <li>
          Jetez un œil à <Link href="/overview" className="text-mv-green-dark underline">l&apos;Aperçu</Link> : c&apos;est
          votre tableau de bord principal, à consulter chaque jour.
        </li>
      </ol>
    ),
  },
  {
    icon: LayoutGrid,
    title: "Se repérer dans l'application",
    body: (
      <p>
        La barre latérale est organisée en groupes que vous pouvez replier : <strong>Opérations</strong> (journées,
        programmes), <strong>Croissance</strong> (campagnes, cartes), <strong>Équipe</strong> (collaborateurs) et{" "}
        <strong>Finance</strong>. L&apos;Aperçu et l&apos;Assistant restent toujours visibles en haut, car ce sont les pages
        les plus utilisées au quotidien. Sur mobile, la navigation passe en bas de l&apos;écran.
      </p>
    ),
  },
  {
    icon: CalendarCheck2,
    title: "Journées de service",
    body: (
      <p>
        Chaque jour d&apos;ouverture, ajoutez une entrée avec le revenu, le niveau d&apos;affluence et les événements
        notables (promo active, changement de menu, etc.). Ces données servent à calculer vos tendances de revenu,
        détecter les anomalies et générer les recommandations automatiques.
      </p>
    ),
  },
  {
    icon: Wallet,
    title: "Finance",
    body: (
      <p>
        Connectez vos comptes (banque, point de vente, livraison) dans{" "}
        <Link href="/settings" className="text-mv-green-dark underline">Paramètres → Intégrations</Link> pour
        importer vos transactions automatiquement, ou importez un fichier CSV directement depuis la page Finance.
        Les règles d&apos;alertes (chute de revenu, pic de dépenses) se configurent au même endroit.
      </p>
    ),
  },
  {
    icon: Megaphone,
    title: "Campagnes",
    body: (
      <p>
        Créez une campagne (post, email ou promotion) depuis une page dédiée : nom, description, dates, et jusqu&apos;à
        5 images plus 2 fichiers en pièce jointe. Une fois créée, marquez-la « Démarrée » puis « Terminée » depuis
        son détail — votre équipe est notifiée à chaque étape.
      </p>
    ),
  },
  {
    icon: Users,
    title: "Collaborateurs",
    body: (
      <p>
        Invitez votre équipe par lien plutôt que par email : choisissez le rôle, générez le lien, partagez-le.
        Il reste valide 7 jours. Les rôles (propriétaire, gérant, employé, consultant) déterminent ce que chacun
        peut voir et modifier.
      </p>
    ),
  },
  {
    icon: LineChart,
    title: "Rapports & métriques",
    body: (
      <p>
        Chaque rapport (revenu, marge, journées…) peut être <strong>filtré</strong> sur une période personnalisée, et{" "}
        <strong>partagé</strong> via un lien public en lecture seule — utile pour l&apos;envoyer à un associé ou un
        comptable sans lui donner accès à l&apos;application. Le bouton « Exporter vers Sheets » (si Google Workspace
        est connecté) envoie les données brutes dans un tableur.
      </p>
    ),
  },
  {
    icon: Sparkles,
    title: "Assistant IA",
    body: (
      <p>
        Posez des questions en langage naturel sur vos données — « pourquoi le revenu a baissé mercredi ? »,
        « quel programme a la meilleure marge ? ». L&apos;assistant peut générer des tableaux, graphiques et résumés
        directement dans la conversation.
      </p>
    ),
  },
  {
    icon: Bell,
    title: "Notifications",
    body: (
      <p>
        La cloche en haut de l&apos;écran regroupe les alertes (chute de revenu, synchronisation cassée…) et les
        événements d&apos;équipe (nouveau collaborateur, campagne créée, changement de rôle). Un résumé hebdomadaire
        des points à surveiller est aussi envoyé chaque lundi.
      </p>
    ),
  },
  {
    icon: Plug,
    title: "Connecter vos partenaires",
    body: (
      <div className="space-y-4">
        <p>
          Tous les branchements se font depuis{" "}
          <Link href="/settings" className="text-mv-green-dark underline">Paramètres → Intégrations</Link>{" "}
          (ou l&apos;onglet <Link href="/finance" className="text-mv-green-dark underline">Comptes</Link> de Finance
          pour Square). Chacun est indépendant des autres — inutile de tous les connecter pour utiliser l&apos;app.
        </p>
        <div>
          <p className="font-semibold text-mv-ink">Square (caisse)</p>
          <p>
            Cliquez « Connecter », autorisez l&apos;accès sur la page Square qui s&apos;ouvre. Si la page Square
            se recharge sans rien vous laisser faire : l&apos;adresse de redirection enregistrée dans votre tableau
            de bord Square développeur doit correspondre exactement à{" "}
            <code className="rounded bg-mv-cream-soft px-1 py-0.5 text-[12px]">
              https://minerva-flow.vercel.app/api/oauth/square/callback
            </code>
            .
          </p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Google (Gmail, Sheets, Drive, Calendar, Analytics, Ads)</p>
          <p>
            Une erreur « redirect_uri_mismatch » veut dire que l&apos;adresse de redirection n&apos;est pas
            enregistrée dans Google Cloud Console pour votre projet. Trois adresses doivent y être ajoutées
            (Identifiants → votre client OAuth → URI de redirection autorisés) :
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px]">
            <li>
              <code className="rounded bg-mv-cream-soft px-1 py-0.5">
                https://minerva-flow.vercel.app/api/oauth/google/callback
              </code>{" "}
              (Google Ads / Analytics, depuis Paramètres)
            </li>
            <li>
              <code className="rounded bg-mv-cream-soft px-1 py-0.5">
                https://minerva-flow.vercel.app/api/oauth/google-workspace/callback
              </code>{" "}
              (Gmail, Sheets, Drive, Calendar, Analytics — connexion Workspace du restaurant)
            </li>
            <li>
              <code className="rounded bg-mv-cream-soft px-1 py-0.5">
                https://minerva-flow.vercel.app/api/oauth/google-calendar/callback
              </code>{" "}
              (calendrier personnel, depuis Profil)
            </li>
          </ul>
          <p className="mt-1.5">
            Accédez toujours à l&apos;application par{" "}
            <code className="rounded bg-mv-cream-soft px-1 py-0.5 text-[12px]">minerva-flow.vercel.app</code> —
            une autre adresse (aperçu, alias secondaire) provoque la même erreur même si tout est bien configuré.
          </p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Meta Ads</p>
          <p>Même principe que Google Ads — connexion depuis Paramètres → Intégrations, autorisation sur Facebook.</p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Pas encore disponibles</p>
          <p>
            Stripe (facturation), les réservations tierces (OpenTable, Resy…) et un compte bancaire générique
            exigent un partenariat d&apos;affaires ou une décision de mise en service — ils s&apos;afficheront
            « Pas encore disponible » jusqu&apos;à ce moment-là, ce n&apos;est pas une erreur.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: CircleHelp,
    title: "Situations courantes",
    body: (
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-mv-ink">J&apos;ai oublié d&apos;enregistrer une journée</p>
          <p>Ajoutez-la rétroactivement depuis la page Journées — la date est modifiable librement.</p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Un collaborateur a quitté l&apos;équipe</p>
          <p>
            Retirez-le depuis <Link href="/collaborateurs" className="text-mv-green-dark underline">Collaborateurs</Link>{" "}
            (icône poubelle) — il perd instantanément l&apos;accès.
          </p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Je gère plusieurs établissements</p>
          <p>
            Ajoutez-les depuis « Gérer le workspace » et basculez entre eux via le menu en haut de la barre
            latérale.
          </p>
        </div>
        <div>
          <p className="font-semibold text-mv-ink">Une question qui n&apos;est pas couverte ici</p>
          <p>
            Passez par <Link href="/support" className="text-mv-green-dark underline">Aide &amp; Support</Link> —
            on répond directement.
          </p>
        </div>
      </div>
    ),
  },
];

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Paramètres"
        title="Guide de configuration"
        description="Tout ce qu'il faut savoir pour configurer et utiliser Minerva Flow, du premier login aux situations du quotidien."
        action={
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Download size={14} /> Télécharger en PDF
          </Button>
        }
      />

      <div className="max-w-3xl space-y-3">
        {sections.map((s) => (
          <Card key={s.title} padded={false}>
            <details className="group open:pb-5" open={s === sections[0]}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                  <s.icon size={16} />
                </span>
                <span className="flex-1 font-display text-[15.5px] font-medium text-mv-ink">{s.title}</span>
                <span className="text-mv-ink-faint transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="px-5 text-[13.5px] leading-relaxed text-mv-ink-soft [&_a]:font-medium">
                {s.body}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
