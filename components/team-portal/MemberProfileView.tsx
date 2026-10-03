import { ExternalLink, GitBranch } from "lucide-react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { CONTRIBUTION_SOURCES } from "@/lib/team/contributions";
import type { MemberProfile } from "@/lib/data/team-members";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ProfileForms, DeleteContentLinkButton } from "./ProfileForms";

function weekLabel(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("fr-CA", { day: "numeric", month: "long", timeZone: "UTC" });
}

export function MemberProfileView({ profile }: { profile: MemberProfile }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-mv-green-tint font-display text-[20px] font-medium text-mv-green-dark" aria-hidden="true">
          {profile.initials}
        </span>
        <div>
          <h1 className="font-display text-2xl text-mv-ink">{profile.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={profile.isTeamMember ? "green" : "purple"} variant="subtle" size="sm">
              {profile.isTeamMember ? "Équipe" : "Ambassadeur"}
            </Badge>
            {profile.githubLogin ? (
              <a
                href={`https://github.com/${profile.githubLogin}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-mv-ink-soft hover:text-mv-ink"
              >
                <GitBranch size={13} /> {profile.githubLogin}
              </a>
            ) : (
              profile.isTeamMember && <span className="text-[12.5px] text-mv-ink-faint">GitHub non lié</span>
            )}
          </div>
        </div>
      </div>

      {profile.githubStatus === "unavailable" && (
        <AlertBanner tone="warning" title="GitHub indisponible">
          Les commits n’ont pas pu être lus (limite de requêtes ou réseau). Le graphique ci-dessous ne les inclut pas : un graphique vide ne veut pas dire zéro commit.
        </AlertBanner>
      )}

      <Card>
        <CardHeader eyebrow="Implication" title={`${profile.heatmap.total} contribution${profile.heatmap.total === 1 ? "" : "s"} · 26 semaines`} />
        <ContributionHeatmap heatmap={profile.heatmap} />
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CONTRIBUTION_SOURCES.map((source) => (
            <div key={source.key} className="rounded-xl bg-mv-cream-soft p-3">
              <dd className="font-display text-[22px] font-medium leading-none text-mv-ink">{profile.heatmap.bySource[source.key]}</dd>
              <dt className="mt-1.5 text-[11.5px] text-mv-ink-faint">{source.label}</dt>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="font-display text-[16px] font-medium text-mv-ink">Ce qui est mesuré, et ce qui ne l’est pas</h2>
        <div className="mt-3 grid gap-4 text-[13px] leading-relaxed text-mv-ink-soft sm:grid-cols-2">
          <div>
            <p className="font-semibold text-mv-ink">Compté</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Commits GitHub liés à votre identifiant, dans le dépôt Minerva Flow.</li>
              <li>Recommandations et contenus UGC soumis dans le programme ambassadeur.</li>
              <li>Liens de contenu que vous déclarez vous-même.</li>
              <li>Votre bilan hebdomadaire, quand vous l’écrivez.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-mv-ink">Jamais compté</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Vos connexions, votre temps passé dans l’app ou vos horaires.</li>
              <li>Le contenu de vos messages ou de votre travail hors de ces sources.</li>
              <li>Aucun score caché : ce que vous voyez ici est tout ce que voient les autres membres de l’équipe.</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Contenus" title="Contenus déclarés" />
          {profile.contentLinks.length === 0 ? (
            <p className="text-[13px] text-mv-ink-faint">Aucun contenu déclaré pour l’instant.</p>
          ) : (
            <ul className="space-y-2.5">
              {profile.contentLinks.map((link) => (
                <li key={link.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <div className="min-w-0">
                    <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-mv-ink hover:text-mv-green-dark">
                      <span className="truncate">{link.title || link.url}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      {link.platform} · {weekLabel(link.publishedOn)}
                    </p>
                  </div>
                  {profile.isSelf && <DeleteContentLinkButton id={link.id} />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {profile.isTeamMember && (
          <Card>
            <CardHeader eyebrow="Bilans" title="Derniers bilans hebdomadaires" />
            {profile.checkins.length === 0 ? (
              <p className="text-[13px] text-mv-ink-faint">Aucun bilan pour l’instant.</p>
            ) : (
              <ul className="space-y-4">
                {profile.checkins.map((checkin) => (
                  <li key={checkin.weekStart} className="text-[13px] leading-relaxed">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">Semaine du {weekLabel(checkin.weekStart)}</p>
                    {checkin.commitments && (
                      <p className="mt-1 text-mv-ink">
                        <span className="font-semibold">Engagements : </span>
                        {checkin.commitments}
                      </p>
                    )}
                    {checkin.delivered && (
                      <p className="mt-1 text-mv-ink">
                        <span className="font-semibold">Livré : </span>
                        {checkin.delivered}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {profile.isSelf && <ProfileForms isTeamMember={profile.isTeamMember} githubLogin={profile.githubLogin} />}
    </div>
  );
}
