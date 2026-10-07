import { LogoMark } from "@/components/shell/Logo";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TeamPortalAccess } from "@/lib/data/team-portal";
import { TeamPortalSignOutButton } from "./TeamPortalSignOutButton";
import { TeamPortalReplayIntroButton } from "./TeamPortalReplayIntroButton";

export function TeamPortalShell({
  access,
  children,
}: {
  access: TeamPortalAccess;
  children: React.ReactNode;
}) {
  const roleLabel = access.isTeamMember ? "Équipe" : "Ambassadeur";

  return (
    <div className="min-h-screen bg-mv-cream">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-mv-border bg-mv-cream-soft px-5 lg:h-14 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6">
          <Link href="/equipe" className="flex min-h-11 shrink-0 items-center gap-2">
            <LogoMark size={22} />
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-mv-ink">
              <ShieldCheck size={13} className="hidden text-mv-green-dark sm:block" /> Minerva Flow · {roleLabel}
            </span>
          </Link>
          <nav aria-label="Espace équipe" className="order-3 col-span-2 flex min-w-0 items-center gap-4 overflow-x-auto text-[13px] font-medium text-mv-ink-soft lg:order-2 lg:col-span-1">
            <Link href="/equipe" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
              Accueil
            </Link>
            <Link href="/equipe/academie/produit" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
              Produit
            </Link>
            <Link href="/equipe/academie/gtm" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
              Marché et GTM
            </Link>
            {access.isTeamMember && (
              <Link href="/equipe/objectifs" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
                Objectifs
              </Link>
            )}
            {access.isTeamMember && (
              <Link href="/equipe/partager" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
                Partager
              </Link>
            )}
            {access.isTeamMember && (
              <Link href="/equipe/membres" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
                Membres
              </Link>
            )}
            <Link href="/equipe/membres/me" className="inline-flex min-h-11 items-center whitespace-nowrap hover:text-mv-ink">
              Mon profil
            </Link>
          </nav>
        <div className="order-2 flex shrink-0 items-center gap-1 lg:order-3 lg:gap-4">
          <TeamPortalReplayIntroButton />
          <TeamPortalSignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
