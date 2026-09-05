import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/shell/Logo";
import { Sparkles, ArrowLeft } from "lucide-react";

export function AssistantUnavailable() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-mv-cream px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute -inset-3 rounded-3xl bg-mv-green/10 animate-pulse" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
          <LogoMark size={36} />
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-mv-green/30 bg-mv-green-tint px-3 py-1 text-[11.5px] font-bold text-mv-green-dark">
        <Sparkles size={13} />
        <span>En construction</span>
      </div>

      <h1 className="font-display text-[26px] font-medium text-mv-ink sm:text-[30px]">
        Flow AI arrive bientôt
      </h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-mv-ink-soft">
        Nous peaufinons votre copilote IA pour qu&apos;il réponde vraiment bien à vos questions sur vos
        chiffres. Il sera de retour très bientôt, encore meilleur.
      </p>

      <Link
        href="/overview"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-mv-green px-5 py-2.5 text-[13.5px] font-semibold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
      >
        <ArrowLeft size={15} />
        <span>Retour à l&apos;aperçu</span>
      </Link>
    </div>
  );
}
