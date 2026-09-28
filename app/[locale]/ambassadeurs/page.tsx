import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Check, Gift, Users, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "Devenir ambassadeur | Minerva Flow",
  description: "Recommandez Minerva Flow, créez du contenu avec des restaurants participants et suivez vos commissions dans votre espace dédié.",
};

export default function AmbassadorLandingPage() {
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
    <section className="rounded-3xl border border-mv-border-soft bg-gradient-to-br from-mv-cream-soft via-mv-surface to-mv-green/5 px-6 py-9 sm:px-10 sm:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mv-green-dark">Programme ouvert à tous</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-mv-ink sm:text-5xl">Aidez les restaurants à mieux tourner. Soyez récompensé quand vous les mettez en relation.</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-mv-ink-soft">Rejoignez gratuitement Minerva Flow comme restaurateur, membre d’équipe, créateur ou partenaire. Votre lien suit les nouvelles inscriptions et votre espace dédié vous accompagne à chaque étape.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Button href="/sign-up">Créer mon compte gratuit <ArrowRight size={15} /></Button><Link href="/login" className="inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft">J’ai déjà un compte</Link></div>
      <p className="mt-3 text-[11px] text-mv-ink-faint">Essai propriétaire actuel : 14 jours. Aucune remise additionnelle annoncée.</p>
    </section>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader eyebrow="01 · Recommandations" title="Un lien personnel" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">Partagez-le à un restaurateur. Les créations de workspace issues du lien sont attribuées à votre tableau de bord.</p></Card>
      <Card><CardHeader eyebrow="02 · Récompense" title="10 % sur la première facture" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">La commission est calculée sur la première facture d’abonnement payée. Elle devient payable après 30 jours, sous réserve d’annulation ou de remboursement.</p></Card>
      <Card><CardHeader eyebrow="03 · Versement" title="Stripe sécurisé" /><p className="text-[12.5px] leading-relaxed text-mv-ink-soft">Après vérification d’identité par Stripe, demandez dans votre espace le transfert des commissions arrivées à échéance. Le dépôt bancaire suit le calendrier Stripe.</p></Card>
    </div>
    <Card><CardHeader eyebrow="Création communautaire" title="Du vrai contenu, avec de vrais restaurants" description="Les établissements choisissent eux-mêmes de participer avant d’apparaître dans le répertoire UGC." /><div className="grid gap-4 sm:grid-cols-3"><Info icon={<Users size={17} />} title="Le restaurant choisit" text="Aucun nom, témoignage ou média n’est publié sans consentement explicite." /><Info icon={<Video size={17} />} title="Vous créez" text="Partagez une démo réelle ou une expérience vérifiable et ajoutez la mention de votre relation commerciale." /><Info icon={<Check size={17} />} title="Minerva vérifie" text="Les contenus passent en revue avant réutilisation par Minerva Flow." /></div><p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-mv-ink-faint"><Gift size={14} className="mt-0.5 shrink-0" />Aucun gain UGC distinct n’est promis pour l’instant. Toute commission de recommandation suit la règle de 10 % affichée dans le tableau de bord.</p></Card>
    <div className="flex flex-col items-center rounded-2xl border border-mv-border-soft px-5 py-7 text-center"><h2 className="font-display text-2xl text-mv-ink">Commencez en quelques minutes</h2><p className="mt-2 max-w-xl text-[12.5px] text-mv-ink-soft">Créez un compte, ouvrez Workspace → Ambassadeurs & UGC, puis activez votre lien de recommandation.</p><Button className="mt-4" href="/sign-up">Rejoindre gratuitement <ArrowRight size={14} /></Button></div>
  </main>;
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl bg-mv-cream-soft p-4"><span className="text-mv-green-dark">{icon}</span><h3 className="mt-2 text-[13px] font-semibold text-mv-ink">{title}</h3><p className="mt-1 text-[11.5px] leading-relaxed text-mv-ink-soft">{text}</p></div>; }
