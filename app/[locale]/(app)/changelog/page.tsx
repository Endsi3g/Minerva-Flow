import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getChangelogEntries } from "@/lib/data/changelog";
import { formatDateFull } from "@/lib/utils";
import type { ChangelogCategory } from "@/lib/data/changelog";
import { History } from "lucide-react";

const categoryLabel: Record<ChangelogCategory, string> = {
  fonctionnalite: "Nouveauté",
  amelioration: "Amélioration",
  correctif: "Correctif",
};

const categoryTone: Record<ChangelogCategory, "green" | "amber" | "neutral"> = {
  fonctionnalite: "green",
  amelioration: "amber",
  correctif: "neutral",
};

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <div className="mx-auto max-w-2xl w-full">
      <PageHeader
        eyebrow="Paramètres"
        title="Journal des mises à jour"
        description="Tout ce qui change dans Flow par Minerva, dans l'ordre où c'est arrivé."
      />

      {entries.length === 0 ? (
        <EmptyState icon={History} title="Aucune mise à jour publiée pour l'instant" />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Badge tone={categoryTone[entry.category]}>{categoryLabel[entry.category]}</Badge>
                <span className="text-[11.5px] text-mv-ink-faint">
                  {formatDateFull(entry.publishedAt.slice(0, 10))}
                </span>
              </div>
              <p className="font-display text-[16px] font-medium text-mv-ink">{entry.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-mv-ink-soft">{entry.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
