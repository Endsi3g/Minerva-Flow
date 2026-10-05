import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/minerva/PageCard";
import type { MemberSummary } from "@/lib/data/team-members";
import { ContributionHeatmap } from "./ContributionHeatmap";

export function MemberDirectory({ members, currentUserId }: { members: MemberSummary[]; currentUserId: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-mv-ink">Membres de l’équipe</h1>
        <p className="mt-1 text-[13.5px] text-mv-ink-soft">
          Visible par les membres de l’équipe seulement. Classés par ordre alphabétique : ce n’est pas un classement de performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member) => (
          <Link key={member.id} href={`/equipe/membres/${member.id}`} className="group block">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-mv-green/40 group-hover:shadow-mv-md">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-[13px] font-semibold text-mv-green-dark" aria-hidden="true">
                  {member.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[16px] font-medium text-mv-ink">
                    {member.name}
                    {member.id === currentUserId && <span className="ml-2 text-[12px] font-normal text-mv-ink-faint">(vous)</span>}
                  </p>
                  <p className="text-[12px] text-mv-ink-faint">
                    {member.heatmap.total} contribution{member.heatmap.total === 1 ? "" : "s"} · 26 semaines
                  </p>
                </div>
                {member.githubStatus === "not_linked" && (
                  <Badge tone="neutral" variant="subtle" size="sm">
                    GitHub non lié
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <ContributionHeatmap heatmap={member.heatmap} size="sm" showLegend={false} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
