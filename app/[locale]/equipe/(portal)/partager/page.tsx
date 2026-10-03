import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { getMinervaShareResults } from "@/lib/data/share-results";
import { minervaShareMetrics } from "@/lib/share/results";
import { ResultsShareStudio } from "@/components/share/ResultsShareStudio";

export const metadata: Metadata = { title: "Partager nos résultats — Minerva Flow" };

export default async function TeamSharePage() {
  const locale = await getLocale();
  const access = await getTeamPortalAccess();
  // Product-usage figures are internal until the team publishes them:
  // ambassadors are sent back to the home.
  if (!access?.isTeamMember) redirect(`/${locale}/equipe`);

  const metrics = minervaShareMetrics(await getMinervaShareResults());

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-[26px] font-semibold text-mv-ink">Partager nos résultats</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-mv-ink-soft">
          Visuel ou vidéo avec les chiffres réels de Minerva Flow (comptes de démonstration, de test et internes exclus). Les revenus, abonnements et objectifs ne sont jamais proposés.
        </p>
      </header>
      <ResultsShareStudio
        metrics={metrics}
        defaultHeadline="Minerva Flow en action"
        defaultSubtitle="Résultats réels de nos restaurants"
        fileBase="minerva-flow-resultats"
        emptyTitle="Pas encore de résultat à publier"
        emptyHint="Dès que des restaurants publient un menu et inscrivent des clients, leurs chiffres apparaîtront ici."
      />
    </div>
  );
}
