import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import {
  LineChart,
  Sparkles,
  Share2,
  Users2,
  CalendarCheck2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: LineChart,
    title: "Votre revenu, jour après jour",
    description:
      "Enregistrez chaque journée de service en trente secondes. Les tendances, les creux et les pics apparaissent d'eux-mêmes — plus besoin de faire les calculs dans un coin de tête.",
  },
  {
    icon: Sparkles,
    title: "Un assistant qui connaît vos chiffres",
    description:
      "Posez une question en langage courant — « pourquoi le revenu a baissé mercredi ? » — et obtenez une réponse basée sur vos propres données, pas des généralités.",
  },
  {
    icon: Users2,
    title: "Une équipe suivie, pas juste gérée",
    description:
      "Quarts, ponctualité, revues de performance — de quoi savoir qui mérite une augmentation avec de vrais arguments, pas juste une impression.",
  },
  {
    icon: Share2,
    title: "Des rapports qu'on peut montrer",
    description:
      "Partagez un rapport avec votre comptable ou un associé en un lien, sans leur donner accès à toute l'application.",
  },
];

const steps = [
  {
    step: "1",
    title: "Configurez votre établissement",
    description: "Nom, adresse, fuseau horaire — moins de deux minutes.",
  },
  {
    step: "2",
    title: "Importez votre historique",
    description: "Un fichier Excel ou CSV suffit pour retrouver vos tendances passées immédiatement.",
  },
  {
    step: "3",
    title: "Invitez votre équipe",
    description: "Un lien à partager, aucun mot de passe à transmettre par courriel.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/overview");

  return (
    <div className="bg-mv-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-sans text-[15px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </div>
        <Link href="/login" className="text-[13px] font-semibold text-mv-ink-soft hover:text-mv-ink">
          Se connecter
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-10 text-center sm:pt-16">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-mv-green-dark">
          Fait pour les restaurateurs du Québec
        </p>
        <h1 className="font-display text-[36px] font-medium leading-[1.1] tracking-tight text-mv-ink sm:text-[48px]">
          Le cockpit de revenus pour votre restaurant, sans devenir comptable
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-mv-ink-soft">
          Minerva Flow remplace le classeur Excel maison par un tableau de bord qui comprend vos
          journées, vos campagnes et votre équipe — et qui vous dit ce qui compte, pas juste ce qui
          s&apos;est passé.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="#pilote" size="lg">
            Demander un accès pilote <ArrowRight size={15} data-icon="inline-end" />
          </Button>
          <Button href="/login" variant="secondary" size="lg">
            J&apos;ai déjà un compte
          </Button>
        </div>
      </section>

      <section className="border-y border-mv-border bg-mv-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                  <f.icon size={18} />
                </div>
                <h3 className="mb-1.5 font-display text-[16px] font-medium text-mv-ink">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-mv-ink-soft">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
          En pratique
        </p>
        <h2 className="mb-10 text-center font-display text-[26px] font-medium text-mv-ink">
          Configuré et utile en cinq minutes
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-mv-green font-display text-[15px] font-medium text-mv-cream-soft">
                {s.step}
              </div>
              <h3 className="mb-1.5 font-display text-[15px] font-medium text-mv-ink">{s.title}</h3>
              <p className="text-[13px] leading-relaxed text-mv-ink-soft">{s.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href="/guide"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-mv-green-dark hover:underline"
          >
            <CalendarCheck2 size={14} /> Voir le guide complet
          </Link>
        </div>
      </section>

      <section id="pilote" className="border-t border-mv-border bg-mv-surface py-16">
        <div className="mx-auto max-w-2xl px-6">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
            Programme pilote
          </p>
          <h2 className="mb-3 text-center font-display text-[26px] font-medium text-mv-ink">
            On configure ça ensemble
          </h2>
          <p className="mb-8 text-center text-[13.5px] text-mv-ink-soft">
            Les places pilotes sont limitées et accompagnées personnellement — laissez vos coordonnées,
            on vous recontacte.
          </p>
          <PilotRequestForm />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-[12px] text-mv-ink-faint">
        <p>
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-mv-ink">
            Conditions d&apos;utilisation
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-mv-ink">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
    </div>
  );
}
