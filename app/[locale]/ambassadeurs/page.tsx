import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Check, Gift, Users, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "Programme Ambassadeurs & Recommandations",
  description:
    "Recommandez Minerva Flow aux restaurants et cafés de votre réseau. Une rétribution convenue par contrat simple, et un suivi en direct de vos recommandations.",
  alternates: {
    canonical: "/ambassadeurs",
  },
  openGraph: {
    title: "Minerva Flow | Programme Ambassadeurs & Recommandations",
    description:
      "Aidez les restaurants à moderniser leur gestion et soyez rétribué selon un contrat simple convenu avec nous.",
    images: ["/og.png"],
  },
};

const AMBASSADOR_MAILTO = "mailto:flow@minervaflow.app?subject=Programme%20ambassadeur&body=Bonjour%2C%0A%0AJe%20souhaite%20devenir%20ambassadeur%20Minerva%20Flow.%0A%0AMon%20nom%20%3A%0AMon%20activit%C3%A9%20%3A%20(barman%2C%20chef%2C%20consultant%2C%20fournisseur%E2%80%A6)%0AMon%20r%C3%A9seau%20%3A%20(nombre%20approximatif%20de%20restaurants%20que%20je%20connais)%0AMon%20t%C3%A9l%C3%A9phone%20%3A%0A";

export default function AmbassadorLandingPage() {
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
    <section className="rounded-3xl border border-mv-border-soft bg-gradient-to-br from-mv-cream-soft via-mv-surface to-mv-green/5 px-6 py-9 sm:px-10 sm:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mv-green-dark">Programme ouvert à tous</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-mv-ink sm:text-5xl">Aidez les restaurants à mieux tourner. Soyez récompensé quand vous les mettez en relation.</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-mv-ink-soft">Rejoignez gratuitement Minerva Flow comme restaurateur, membre d’équipe, créateur ou partenaire. Votre lien suit les nouvelles inscriptions et votre espace dédié vous accompagne à chaque étape.</p>
      <div className="mt-6 flex flex-wrap gap-3"><a href={AMBASSADOR_MAILTO} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-mv-green px-5 text-[14px] font-semibold text-mv-cream-soft hover:bg-mv-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green">Devenir ambassadeur : nous écrire <ArrowRight size={15} /></a><Link href="/login" className="inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft">J’ai déjà un compte</Link></div>
      <p className="mt-3 text-[11px] text-mv-ink-faint">Accès gratuit pendant le développement. Aucune remise additionnelle annoncée.</p>
    </section>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader eyebrow="01 · Recommandations" title="Un lien personnel" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">Partagez-le à un restaurateur. Les créations de workspace issues du lien sont attribuées à votre tableau de bord.</p></Card>
      <Card><CardHeader eyebrow="02 · Contrat" title="Une rétribution convenue avec vous" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">Écrivez-nous : on fixe ensemble les conditions, puis vous signez un contrat simple. Votre lien est activé une fois le contrat signé.</p></Card>
      <Card><CardHeader eyebrow="03 · Suivi et versement" title="Tout est visible dans votre espace" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">Vous voyez vos recommandations en direct. Les modalités de versement figurent dans votre contrat.</p></Card>
    </div>
    <Card><CardHeader eyebrow="Création communautaire" title="Du vrai contenu, avec de vrais restaurants" description="Les établissements choisissent eux-mêmes de participer avant d’apparaître dans le répertoire UGC." /><div className="grid gap-4 sm:grid-cols-3"><Info icon={<Users size={17} />} title="Le restaurant choisit" text="Aucun nom, témoignage ou média n’est publié sans consentement explicite." /><Info icon={<Video size={17} />} title="Vous créez" text="Partagez une démo réelle ou une expérience vérifiable et ajoutez la mention de votre relation commerciale." /><Info icon={<Check size={17} />} title="Minerva vérifie" text="Les contenus passent en revue avant réutilisation par Minerva Flow." /></div><p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-mv-ink-faint"><Gift size={14} className="mt-0.5 shrink-0" />Aucun gain UGC distinct n’est promis pour l’instant. Toute commission de recommandation suit la règle de 10 % affichée dans le tableau de bord.</p></Card>
    <div className="flex flex-col items-center rounded-2xl border border-mv-border-soft px-5 py-7 text-center"><h2 className="font-display text-2xl text-mv-ink">Commencez par un courriel</h2><p className="mt-2 max-w-xl text-[12.5px] text-mv-ink-soft">Dites-nous qui vous êtes et qui vous connaissez. On vous répond avec une proposition de contrat; une fois signé, votre lien ambassadeur est activé dans votre espace.</p><Button className="mt-4" href="/sign-up">Rejoindre gratuitement <ArrowRight size={14} /></Button></div>
  </main>;
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl bg-mv-cream-soft p-4"><span className="text-mv-green-dark">{icon}</span><h3 className="mt-2 text-[13px] font-semibold text-mv-ink">{title}</h3><p className="mt-1 text-[11.5px] leading-relaxed text-mv-ink-soft">{text}</p></div>; }
