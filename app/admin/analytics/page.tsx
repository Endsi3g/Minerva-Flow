import { ExternalLink, BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  const dashboardUrl = host.includes(".i.posthog.com") ? host.replace(".i.posthog.com", ".posthog.com") : null;

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">Analytics produit</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        Suivi d&apos;usage (PostHog) — adoption des fonctionnalités, entonnoir d&apos;onboarding, rétention.
      </p>

      <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <BarChart3 size={18} />
        </div>
        <p className="mb-1.5 font-display text-[16px] font-medium text-mv-ink">
          Tableau de bord détaillé dans PostHog
        </p>
        <p className="mb-4 max-w-md text-[13px] leading-relaxed text-mv-ink-soft">
          Les événements clés (inscription, onboarding complété, journée ajoutée, campagne créée, revue
          publiée…) sont déjà envoyés à PostHog. Consultez les entonnoirs, la rétention et l&apos;adoption
          par fonctionnalité directement dans son tableau de bord.
        </p>
        {dashboardUrl ? (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-mv-ink px-3.5 py-2 text-[13px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-ink/90"
          >
            Ouvrir PostHog <ExternalLink size={13} />
          </a>
        ) : (
          <p className="text-[12.5px] text-mv-ink-faint">
            Configurez NEXT_PUBLIC_POSTHOG_HOST pour afficher un lien direct ici.
          </p>
        )}
      </div>
    </div>
  );
}
