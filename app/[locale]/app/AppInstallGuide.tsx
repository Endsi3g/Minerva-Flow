"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Clock3, Gift, Heart, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/xGr45uuF";
type OrderSnapshot = { status: string; statusChangedAt: string | null; estimatedReadyAt: string | null; cancellationReason: string | null; restaurantName: string; welcomeBonusPoints: number };

const statusCopy: Record<string, string> = {
  soumise: "Votre commande a bien été envoyée. Le restaurant vous confirme bientôt.",
  confirmee: "C’est confirmé ! Le restaurant prépare votre commande.",
  en_preparation: "Votre repas est en préparation. Il sera bientôt prêt.",
  prete: "Votre commande est prête. Vous pouvez passer la chercher.",
  servie: "Merci d’être passé·e ! Bon appétit et à bientôt.",
  annulee: "Petit imprévu : votre commande est annulée sans frais.",
};

export function AppInstallGuide({
  bonusPoints,
  restaurantId,
  restaurantName,
  menuToken,
  orderId,
}: {
  bonusPoints: number;
  restaurantId: string | null;
  restaurantName: string | null;
  menuToken: string | null;
  orderId: string | null;
}) {
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let disposed = false;
    const refresh = async () => {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(orderId)}/status`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const snapshot = await response.json() as OrderSnapshot;
      if (!disposed) setOrder(snapshot);
    };
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [orderId]);

  const accountHref = restaurantId
    ? `/customer-sign-up?restaurant=${encodeURIComponent(restaurantId)}${menuToken ? `&menu=${encodeURIComponent(menuToken)}` : ""}`
    : "/portal/login";

  return (
    <main className="min-h-screen bg-[#f5f1e6] px-5 py-8 text-[#24352c] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Minerva Flow, accueil">
            <LogoMark size={30} />
            <span className="font-sans text-[15px] font-semibold">Minerva <span className="text-[#167f5b]">Flow</span></span>
          </Link>
          {menuToken && <Link href={`/m/${menuToken}`} className="text-sm font-medium text-[#0e5a40] underline underline-offset-4">Retour au menu</Link>}
        </header>

        <section className="mt-10 grid gap-9 rounded-[28px] border border-[#e6e0d2] bg-[#fafaf5] p-6 shadow-sm sm:mt-14 sm:grid-cols-[1.05fr_.95fr] sm:items-center sm:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#167f5b]">{restaurantName ? `Avec ${restaurantName}` : "Pour vos restaurants préférés"}</p>
            <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[#20352a] sm:text-5xl">Vos récompenses vous attendent dans l’app.</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#5c685f]">Vos points, vos récompenses et vos commandes sont dans l’application : c’est là que vous les réclamez. Le menu reste consultable sur le Web.</p>
            {bonusPoints > 0 && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#e7f2e9] px-4 py-3 text-sm font-semibold text-[#0e5a40]">
                <Gift size={17} aria-hidden="true" /> +{bonusPoints} points offerts à votre première ouverture de l’app
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={TESTFLIGHT_URL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#173c2e] px-5 text-sm font-semibold text-white transition hover:bg-[#0e5a40]">
                <Smartphone size={17} /> Installer l’app et réclamer mes récompenses <ArrowRight size={15} />
              </a>
              {restaurantId && <Link href={accountHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cbd8ce] bg-white px-5 text-sm font-semibold text-[#173c2e] hover:bg-[#f2f7f2]">Créer mon compte <ArrowRight size={15} /></Link>}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#778078]">Sur iPhone ou iPad, TestFlight installe la version de test. L’accès au build le plus récent dépend de son traitement par Apple. Android : le menu Web fonctionne sans téléchargement.</p>
          </div>
          <div className="mx-auto w-full max-w-[250px] rounded-[32px] border-[7px] border-[#20352a] bg-white p-2 shadow-xl sm:max-w-[280px]">
            <Image src="/assets/install/native-home.png" alt="Écran d’accueil de Minerva Flow sur iPhone" width={700} height={1400} className="h-auto w-full rounded-[23px]" priority />
          </div>
        </section>

        {orderId && <section aria-live="polite" className="mt-6 rounded-2xl border border-[#cbd8ce] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[#e7f2e9] p-2 text-[#167f5b]"><CheckCircle2 size={19} /></span>
            <div className="min-w-0">
              <p className="font-display text-xl">Merci, votre commande est suivie ici.</p>
              <p className="mt-1 text-sm text-[#5c685f]">{order ? statusCopy[order.status] ?? "Le restaurant met à jour votre commande." : "Nous récupérons son état auprès du restaurant…"}</p>
              {order?.estimatedReadyAt && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#0e5a40]"><Clock3 size={14} /> Heure estimée : {new Date(order.estimatedReadyAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</p>}
              {order?.status === "annulee" && <p className="mt-2 text-sm text-[#5c685f]">Aucun frais ne sera demandé. {order.cancellationReason || "Le restaurant vous contactera si nécessaire."}</p>}
              {order && order.welcomeBonusPoints > 0 && <p className="mt-3 rounded-xl bg-[#e7f2e9] px-3.5 py-3 text-sm font-medium text-[#0e5a40]">Hey, merci d’avoir rejoint {order.restaurantName} ! Voici {order.welcomeBonusPoints} points bonus pour votre première visite. 💚</p>}
              <p className="mt-2 text-[12px] text-[#778078]">Mise à jour automatique · Réf. {orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </section>}

        <section className="mt-10 grid gap-6 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#e6e0d2] bg-[#fafaf5] p-5"><span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e7f2e9] text-[#167f5b]"><ArrowDown size={18} /></span><h2 className="mt-4 font-display text-xl">Installer l’application</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-[#5c685f]"><li>1. Touchez « Installer avec TestFlight » sur votre iPhone.</li><li>2. Installez TestFlight depuis l’App Store si demandé.</li><li>3. Revenez au lien Minerva Flow et touchez « Accepter » puis « Installer ».</li><li>4. Ouvrez Minerva Flow depuis votre écran d’accueil.</li></ol></article>
          <article className="rounded-2xl border border-[#e6e0d2] bg-[#fafaf5] p-5"><span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e7f2e9] text-[#167f5b]"><Heart size={18} /></span><h2 className="mt-4 font-display text-xl">Rejoindre {restaurantName || "un restaurant"}</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-[#5c685f]"><li>1. Choisissez « Créer mon compte » et indiquez votre nom, votre courriel et un mot de passe.</li><li>2. Votre compte sera associé à ce restaurant.</li><li>3. Retrouvez votre solde, vos récompenses et vos visites dans l’espace client.</li></ol><Link href={accountHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0e5a40]">Commencer <ArrowRight size={14} /></Link></article>
          <article className="rounded-2xl border border-[#e6e0d2] bg-[#fafaf5] p-5"><span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e7f2e9] text-[#167f5b]"><Gift size={18} /></span><h2 className="mt-4 font-display text-xl">Retrouver menu et fidélité</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-[#5c685f]"><li>1. Parcourez les plats proposés et ceux présentés au catalogue.</li><li>2. Commandez depuis le menu; le paiement se fait au restaurant si le paiement en ligne n’est pas activé.</li><li>3. Le restaurant peut configurer un bonus de bienvenue; il s’affichera ici lorsqu’il sera offert.</li></ol></article>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e6e0d2] bg-[#fafaf5] p-6 sm:p-8">
          <div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#167f5b]">L’application en images</p><h2 className="mt-2 font-display text-2xl">Un aperçu avant de commencer</h2></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            <figure><Image src="/assets/install/native-menu.png" alt="Menu et commandes dans Minerva Flow" width={700} height={1400} className="mx-auto max-h-[390px] w-auto rounded-2xl border border-[#e6e0d2] object-contain" /><figcaption className="mt-2 text-center text-xs text-[#66736a]">Menus et commandes</figcaption></figure>
            <figure><Image src="/assets/install/native-rewards.png" alt="Points et récompenses dans Minerva Flow" width={700} height={1400} className="mx-auto max-h-[390px] w-auto rounded-2xl border border-[#e6e0d2] object-contain" /><figcaption className="mt-2 text-center text-xs text-[#66736a]">Points et récompenses</figcaption></figure>
            <figure className="col-span-2 sm:col-span-1"><Image src="/assets/install/native-home.png" alt="Accueil de Minerva Flow" width={700} height={1400} className="mx-auto max-h-[390px] w-auto rounded-2xl border border-[#e6e0d2] object-contain" /><figcaption className="mt-2 text-center text-xs text-[#66736a]">Votre espace</figcaption></figure>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-[#778078]">Le menu Web reste prêt à utiliser sur votre appareil. · <a href={TESTFLIGHT_URL} className="font-semibold text-[#0e5a40] underline underline-offset-4">Ouvrir TestFlight</a></footer>
      </div>
    </main>
  );
}
