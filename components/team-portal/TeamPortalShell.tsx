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
      <header className="flex h-14 items-center justify-between gap-4 border-b border-mv-border bg-mv-cream-soft px-5">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/equipe" className="flex shrink-0 items-center gap-2">
            <LogoMark size={22} />
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-mv-ink">
              <ShieldCheck size={13} className="text-mv-green-dark" /> Minerva Flow · {roleLabel}
            </span>
          </Link>
          <nav aria-label="Espace équipe" className="flex items-center gap-4 overflow-x-auto text-[13px] font-medium text-mv-ink-soft">
            <Link href="/equipe" className="whitespace-nowrap hover:text-mv-ink">
              Accueil
            </Link>
            <Link href="/equipe/academie/produit" className="whitespace-nowrap hover:text-mv-ink">
              Produit
            </Link>
            <Link href="/equipe/academie/gtm" className="whitespace-nowrap hover:text-mv-ink">
              Marché et GTM
            </Link>
            {access.isTeamMember && (
              <Link href="/equipe/objectifs" className="whitespace-nowrap hover:text-mv-ink">
                Objectifs
              </Link>
            )}
            {access.isTeamMember && (
              <Link href="/equipe/membres" className="whitespace-nowrap hover:text-mv-ink">
                Membres
              </Link>
            )}
            <Link href="/equipe/membres/me" className="whitespace-nowrap hover:text-mv-ink">
              Mon profil
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <TeamPortalReplayIntroButton />
          <TeamPortalSignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
