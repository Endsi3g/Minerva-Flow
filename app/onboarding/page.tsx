import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { Users, MessageCircle, CalendarDays, HelpCircle } from "lucide-react";

function GrowthIllustration() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="118" x2="190" y2="118" stroke="var(--mv-border)" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      <path d="M60 118 C60 100 58 84 58 70" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" />
      <path d="M58 90 C50 86 46 80 46 80" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M100 118 C100 92 96 66 96 46" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" />
      <path d="M96 80 C86 74 80 66 80 66" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M96 60 C106 54 112 46 112 46" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M140 118 C140 88 136 52 134 30" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" />
      <path d="M134 70 C122 64 116 54 116 54" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M134 46 C146 40 152 30 152 30" stroke="var(--mv-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g transform="translate(134,20)">
        <circle r="7" fill="var(--mv-lime)" />
        <circle r="3.4" fill="var(--mv-green-dark)" />
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60 * Math.PI) / 180;
          return (
            <ellipse
              key={i}
              cx={Math.cos(angle) * 10}
              cy={Math.sin(angle) * 10}
              rx="6"
              ry="3.4"
              fill="var(--mv-lime)"
              opacity="0.9"
              transform={`rotate(${i * 60}, ${Math.cos(angle) * 10}, ${Math.sin(angle) * 10})`}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default function OnboardingPage() {
  return (
    <div className="flex h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-mv-border bg-mv-cream-soft p-4 md:flex">
        <div className="flex items-center gap-2 px-1 py-2">
          <LogoMark size={22} />
          <span className="font-display text-[14px] font-medium text-mv-ink">Minerva Flow</span>
        </div>
        <div className="mt-4 space-y-0.5 text-[13px] font-semibold text-mv-ink-soft">
          <p className="rounded-lg bg-mv-ink/5 px-3 py-2 text-mv-ink">Overview</p>
          <p className="px-3 py-2">Settings</p>
          <p className="px-3 py-2">Help center</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <GrowthIllustration />
        <h1 className="mt-6 font-display text-[26px] font-medium text-mv-ink">Bienvenue !</h1>
        <p className="mt-2 max-w-md text-center text-[14px] leading-relaxed text-mv-ink-soft">
          Connectez votre source de données et définissez vos métriques pour débloquer un cockpit
          de revenus en libre-service pour toute votre équipe.
        </p>

        <div className="mt-6 flex gap-3">
          <Button href="/settings" variant="primary">
            Connecter une source de données
          </Button>
          <Button href="/overview" variant="secondary">
            Essayer avec des données démo
          </Button>
        </div>

        <div className="mt-12 w-full max-w-lg rounded-2xl border border-mv-border bg-mv-cream-soft p-6 text-center">
          <p className="font-display text-[15px] font-medium text-mv-ink">Besoin d&apos;aide pour démarrer ?</p>
          <p className="mt-1 text-[13px] text-mv-ink-soft">
            Invitez un collègue à collaborer sur la configuration ou contactez Minerva pour être
            guidé pas à pas.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] font-semibold text-mv-ink-soft">
            <span className="flex items-center gap-1.5">
              <Users size={14} /> Inviter un collègue
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} /> Contacter Minerva
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> Planifier une démo
            </span>
            <span className="flex items-center gap-1.5">
              <HelpCircle size={14} /> Centre d&apos;aide
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
