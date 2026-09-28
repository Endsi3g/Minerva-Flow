"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import {
  createAmbassadorPayoutOnboardingAction,
  createAmbassadorTrackingLinkAction,
  getFlowAmbassadorPageAction,
  joinFlowAmbassadorProgramAction,
  optInRestaurantForAmbassadorUgcAction,
  requestAmbassadorPayoutAction,
  submitAmbassadorUgcAction,
  withdrawRestaurantFromAmbassadorUgcAction,
} from "@/app/[locale]/(app)/workspace/actions";
import type { FlowAmbassadorSummary } from "@/lib/data/flow-ambassadors";
import { AmbassadorInstagramTracker } from "@/components/workspace/AmbassadorInstagramTracker";
import { ArrowRight, CheckCircle2, Copy, ExternalLink, Gift, Link2, ShieldCheck, Sparkles, Video } from "lucide-react";

type Dashboard = NonNullable<Awaited<ReturnType<typeof getFlowAmbassadorPageAction>>>;

export function FlowAmbassadorWorkspace({ initial }: { initial: Dashboard }) {
  const locale = useLocale();
  const router = useRouter();
  const [summary, setSummary] = useState<FlowAmbassadorSummary | null>(initial.summary);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [profileName, setProfileName] = useState(initial.ownRestaurant?.name ?? "");
  const [profileCity, setProfileCity] = useState(initial.ownRestaurant?.city ?? "");
  const [linkDraft, setLinkDraft] = useState({ label: "", platform: "instagram", contentUrl: "" });
  const [ugc, setUgc] = useState({ restaurantProfileId: "", platform: "instagram", postUrl: "", caption: "#MinervaFlow", referralLinkId: "", disclosureConfirmed: false, usageRightsConfirmed: false });
  const link = summary?.links[0] ? `https://minervaflow.app/r/${summary.links[0].slug}` : "";
  const shareText = "Je partage Minerva Flow, une plateforme qui aide les restaurants à gérer leurs opérations, fidéliser leur clientèle et suivre leur activité. Découvre l’essai de 14 jours :";

  async function join() {
    setBusy("join");
    try {
      const result = await joinFlowAmbassadorProgramAction();
      setSummary(result);
      setNotice(result ? "Votre espace et votre lien de recommandation sont prêts." : "Impossible de créer votre espace. Réessayez.");
      router.refresh();
    } finally { setBusy(""); }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(`${shareText} ${link}`);
    setNotice("Votre message et votre lien ont été copiés.");
  }

  async function createTrackingLink() {
    setBusy("link");
    const ok = await createAmbassadorTrackingLinkAction(linkDraft);
    setBusy("");
    setNotice(ok ? "Lien de contenu créé. Les clics et les inscriptions seront suivis séparément." : "Vérifiez le nom, la plateforme et le lien de contenu.");
    if (ok) { setLinkDraft({ label: "", platform: "instagram", contentUrl: "" }); router.refresh(); }
  }

  async function connectStripe() {
    setBusy("stripe");
    const url = await createAmbassadorPayoutOnboardingAction(locale);
    setBusy("");
    if (url) window.location.assign(url);
    else setNotice("Impossible d’ouvrir Stripe. Réessayez dans un instant.");
  }

  async function payout(id: string) {
    setBusy(id);
    const result = await requestAmbassadorPayoutAction(id);
    setNotice(result.message);
    setBusy("");
    if (result.ok) router.refresh();
  }

  async function optIn() {
    setBusy("optin");
    const ok = await optInRestaurantForAmbassadorUgcAction({ displayName: profileName, city: profileCity });
    setBusy("");
    setNotice(ok ? "Restaurant inscrit au répertoire public après consentement." : "Impossible d’enregistrer ce consentement.");
    if (ok) router.refresh();
  }

  async function submitUgc() {
    setBusy("ugc");
    const ok = await submitAmbassadorUgcAction(ugc);
    setBusy("");
    setNotice(ok ? "Contenu envoyé pour vérification." : "Vérifiez les champs et confirmez la divulgation et les droits d’utilisation.");
    if (ok) router.refresh();
  }

  const totalEarned = (summary?.commissions ?? []).filter((item) => item.status !== "void").reduce((total, item) => total + item.amount, 0);

  return (
    <div className="space-y-6">
      {!summary ? (
        <Card className="overflow-hidden border-mv-green/20 bg-gradient-to-br from-mv-cream-soft to-mv-surface">
          <CardHeader eyebrow="Programme ouvert à tous" title="Recommandez Minerva Flow. Recevez une commission sur les nouveaux clients." description="Restaurant, équipe, créateur ou partenaire : créez votre lien en un clic. Aucun frais pour rejoindre." />
          <div className="grid gap-3 rounded-xl border border-mv-border-soft bg-mv-surface/80 p-4 sm:grid-cols-3">
            <Benefit icon={<Link2 size={16} />} title="Un lien traçable" text="Chaque inscription par votre lien est associée à votre compte." />
            <Benefit icon={<Gift size={16} />} title="10 % de commission" text="Sur la première facture d’abonnement payée par le workspace recommandé." />
            <Benefit icon={<ShieldCheck size={16} />} title="Règle claire" text="Délai de 30 jours, puis demande de transfert vers votre compte Stripe vérifié." />
          </div>
          <Button className="mt-4" onClick={join} loading={busy === "join"}><Sparkles size={15} /> Rejoindre gratuitement <ArrowRight size={14} /></Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader eyebrow="Votre espace partenaire" title="Faites découvrir Minerva Flow à votre réseau" description="Votre lien suit les inscriptions et votre tableau de bord suit les commissions. Partagez-le en message, bio sociale ou contenu UGC." />
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Workspaces recommandés" value={summary.referrals} />
              <Metric label="Commissions suivies" value={summary.commissions.length} />
              <Metric label="Montant suivi" value={new Intl.NumberFormat(locale, { style: "currency", currency: summary.commissions[0]?.currency ?? "CAD" }).format(totalEarned)} />
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Votre lien personnel</p><p className="mt-1 truncate font-mono text-[12px] text-mv-ink">{link}</p></div>
              <Button size="sm" variant="secondary" onClick={copyLink} disabled={!link}><Copy size={13} /> Copier le message</Button>
              <Button size="sm" onClick={() => navigator.share ? navigator.share({ title: "Minerva Flow", text: shareText, url: link }) : copyLink()} disabled={!link}>Partager <ArrowRight size={13} /></Button>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-mv-ink-faint">Offre propriétaire : essai actuel de 14 jours et accès aux outils de gestion, fidélisation et analyse de Minerva Flow. Aucune remise ou résultat commercial supplémentaire n’est promis.</p>
          </Card>

          <Card>
            <CardHeader eyebrow="Attribution par contenu" title="Un lien traçable pour chaque vidéo" description="Ajoutez ce lien à la bio, à la description ou à votre appel à l’action. Les clics et les inscriptions créées après ce lien seront attribués à cette vidéo." />
            <div className="grid gap-3 md:grid-cols-[1fr_170px_1fr_auto] md:items-end">
              <Field label="Nom du contenu"><Input value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} placeholder="Démo du programme fidélité" /></Field>
              <Field label="Plateforme"><Select value={linkDraft.platform} onChange={(event) => setLinkDraft({ ...linkDraft, platform: event.target.value })}>{[["instagram","Instagram"],["tiktok","TikTok"],["youtube","YouTube"],["linkedin","LinkedIn"],["facebook","Facebook"],["other","Autre"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></Field>
              <Field label="URL de la publication (facultatif)"><Input type="url" value={linkDraft.contentUrl} onChange={(event) => setLinkDraft({ ...linkDraft, contentUrl: event.target.value })} placeholder="https://instagram.com/reel/…" /></Field>
              <Button size="sm" onClick={createTrackingLink} loading={busy === "link"} disabled={linkDraft.label.trim().length < 2}><Link2 size={14} /> Créer le lien</Button>
            </div>
            <p className="mt-3 text-[11.5px] text-mv-ink-faint">Hashtag à ajouter visiblement à la publication : <strong className="text-mv-green-dark">#MinervaFlow</strong></p>
            {summary.links.length > 0 ? <div className="mt-4 divide-y divide-mv-border-soft">{summary.links.map((item) => {
              const trackedUrl = `https://minervaflow.app/r/${item.slug}`;
              return <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-mv-ink">{item.label} <span className="font-normal text-mv-ink-faint">· {item.platform ?? "Lien"}</span></p><p className="truncate font-mono text-[11px] text-mv-ink-soft">{trackedUrl}</p>{item.contentUrl && <a className="text-[11px] text-mv-green-dark underline" href={item.contentUrl} target="_blank" rel="noreferrer">Ouvrir le contenu</a>}</div>
                <div className="flex gap-3 text-[11px] text-mv-ink-soft"><span>{item.clicks} clics</span><span>{item.signups} inscriptions</span></div>
                <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(trackedUrl); setNotice("Lien traçable copié."); }}><Copy size={13} /> Copier</Button>
              </div>;
            })}</div> : <p className="mt-4 text-[12px] text-mv-ink-faint">Créez un lien par vidéo, publication ou source de recommandation.</p>}
          </Card>

          <AmbassadorInstagramTracker connection={initial.instagramConnection} />

          <Card>
            <CardHeader eyebrow="Vos gains" title="Commissions et versements" description="Chaque commission est calculée sur la première facture d’abonnement effectivement payée et devient transférable après le délai de 30 jours." />
            <div className="flex flex-col gap-3 rounded-xl bg-mv-cream-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[13px] font-semibold text-mv-ink">{initial.payoutsEnabled ? "Compte de versement prêt" : "Configurez votre compte de versement"}</p><p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-mv-ink-soft">{initial.payoutsEnabled ? "Les commissions admissibles peuvent être transférées vers votre compte Stripe. Le dépôt bancaire suit le calendrier Stripe." : "Stripe recueille vos coordonnées bancaires et vérifie votre identité via son parcours sécurisé. Après 30 jours, demandez le transfert des commissions devenues payables."}</p></div>
              <Button size="sm" variant={initial.payoutsEnabled ? "secondary" : "primary"} onClick={connectStripe} loading={busy === "stripe"}>{initial.payoutsEnabled ? "Gérer Stripe" : "Configurer les versements"} <ExternalLink size={13} /></Button>
            </div>
            {summary.commissions.length > 0 ? <div className="mt-4 divide-y divide-mv-border-soft">{summary.commissions.map((item) => {
              const due = new Date(item.payableAt).getTime() <= new Date(initial.asOf).getTime();
              const approved = Boolean(item.approvedAt);
              const state = item.status === "paid" ? "Transférée à Stripe" : item.status === "void" ? "Annulée" : !due ? "En attente · 30 jours" : !approved ? "En attente d’approbation Minerva Flow" : "Approuvée · prête au transfert";
              return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[12px]"><div><p className="font-medium text-mv-ink">{new Intl.NumberFormat(locale, { style: "currency", currency: item.currency }).format(item.amount)}</p><p className="mt-0.5 text-mv-ink-faint">{state} · {new Date(item.payableAt).toLocaleDateString(locale)}</p></div>{item.status !== "paid" && item.status !== "void" && approved && <Button size="sm" variant="secondary" disabled={!due || !initial.payoutsEnabled || busy === item.id} loading={busy === item.id} onClick={() => payout(item.id)}>Transférer</Button>}</div>;
            })}</div> : <p className="mt-4 text-[12px] text-mv-ink-faint">Vos commissions apparaîtront ici lorsqu’un workspace recommandé aura payé sa première facture admissible.</p>}
          </Card>
        </>
      )}

      <Card>
        <CardHeader eyebrow="Contenu créé par la communauté" title="UGC avec de vrais restaurants" description="Les établissements ci-dessous ont choisi d’être présentés. Publiez une démonstration ou un témoignage authentique; l’équipe vérifie chaque lien avant réutilisation." />
        {initial.profiles.length ? <div className="mb-5 grid gap-3 sm:grid-cols-2">{initial.profiles.map((profile) => <div key={profile.id} className="rounded-xl border border-mv-border-soft p-3"><div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-mv-green" /><p className="font-medium text-mv-ink">{profile.name}</p></div><p className="mt-1 text-[11.5px] text-mv-ink-faint">{profile.city || "Restaurant participant"}</p>{profile.quote && <p className="mt-2 text-[12px] leading-relaxed text-mv-ink-soft">« {profile.quote} »</p>}</div>)}</div> : <div className="mb-5 rounded-xl bg-mv-cream-soft p-4 text-[12px] leading-relaxed text-mv-ink-soft">Aucun restaurant n’a encore accepté d’être présenté. Invitez un restaurant à activer sa participation depuis son espace Workspace; aucun établissement ne sera ajouté sans consentement explicite.</div>}
        {summary && initial.profiles.length > 0 && <div className="grid gap-3 md:grid-cols-2">
          <Field label="Restaurant participant"><Select value={ugc.restaurantProfileId} onChange={(event) => setUgc({ ...ugc, restaurantProfileId: event.target.value })}><option value="">Choisir un restaurant</option>{initial.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}{profile.city ? ` · ${profile.city}` : ""}</option>)}</Select></Field>
          <Field label="Plateforme"><Select value={ugc.platform} onChange={(event) => setUgc({ ...ugc, platform: event.target.value })}>{[["instagram","Instagram"],["tiktok","TikTok"],["youtube","YouTube"],["linkedin","LinkedIn"],["facebook","Facebook"],["other","Autre"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></Field>
          <Field label="Lien public du contenu"><Input type="url" value={ugc.postUrl} onChange={(event) => setUgc({ ...ugc, postUrl: event.target.value })} placeholder="https://…" /></Field>
          <Field label="Légende / contexte"><Input value={ugc.caption} onChange={(event) => setUgc({ ...ugc, caption: event.target.value })} placeholder="Décrivez ce qui est montré, sans inventer de résultat." /></Field>
          <Field label="Lien de recommandation associé"><Select value={ugc.referralLinkId} onChange={(event) => setUgc({ ...ugc, referralLinkId: event.target.value })}><option value="">Créer le lien séparément ci-dessus</option>{summary?.links.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.clicks} clics</option>)}</Select></Field>
          <p className="md:col-span-2 -mt-2 text-[11px] text-mv-ink-faint">Le tag <strong>#MinervaFlow</strong> est prérempli. Gardez-le dans la légende publiée pour identifier vos vidéos.</p>
          <label className="flex gap-2 text-[11.5px] leading-relaxed text-mv-ink-soft"><input type="checkbox" checked={ugc.disclosureConfirmed} onChange={(event) => setUgc({ ...ugc, disclosureConfirmed: event.target.checked })} className="mt-0.5 accent-mv-green" />J’ajouterai une mention visible à chaque publication, par exemple : « Je peux recevoir une commission de Minerva Flow si un restaurant s’inscrit avec mon lien. »</label>
          <label className="flex gap-2 text-[11.5px] leading-relaxed text-mv-ink-soft"><input type="checkbox" checked={ugc.usageRightsConfirmed} onChange={(event) => setUgc({ ...ugc, usageRightsConfirmed: event.target.checked })} className="mt-0.5 accent-mv-green" />Je détiens les droits sur ce contenu et autorise Minerva Flow à le repartager avec attribution, après approbation.</label>
          <Button className="md:col-span-2 md:justify-self-start" size="sm" onClick={submitUgc} loading={busy === "ugc"} disabled={!ugc.restaurantProfileId || !ugc.postUrl || !ugc.caption || !ugc.disclosureConfirmed || !ugc.usageRightsConfirmed}><Video size={14} /> Envoyer pour vérification</Button>
        </div>}
        {initial.submissions.length > 0 && <div className="mt-5 border-t border-mv-border-soft pt-4"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Vos publications envoyées</p><div className="space-y-2">{initial.submissions.map((entry) => <div key={entry.id} className="flex flex-wrap justify-between gap-2 text-[12px]"><a className="text-mv-green-dark underline" href={entry.post_url} target="_blank" rel="noreferrer">{entry.display_name} · {entry.platform}</a><span className="text-mv-ink-faint">{entry.status === "approved" ? "Approuvée" : entry.status === "rejected" ? "À corriger" : "En vérification"}</span></div>)}</div></div>}
        {initial.canOptInRestaurant && <div className="mt-5 rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4"><p className="text-[13px] font-semibold text-mv-ink">Vous gérez un restaurant? Présentez-le au réseau.</p><p className="mt-1 text-[11.5px] leading-relaxed text-mv-ink-soft">Votre consentement permet à des ambassadeurs de le choisir pour une démonstration. Vous pouvez retirer son nom du répertoire quand vous le souhaitez.</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={profileName} onChange={(event) => setProfileName(event.target.value)} aria-label="Nom public du restaurant" placeholder="Nom public du restaurant" /><Input value={profileCity} onChange={(event) => setProfileCity(event.target.value)} aria-label="Ville" placeholder="Ville, facultatif" /><Button size="sm" variant="secondary" onClick={optIn} loading={busy === "optin"} disabled={profileName.trim().length < 2}>J’accepte d’être présenté</Button></div>{initial.ownProfileActive && <Button size="sm" variant="ghost" className="mt-2" onClick={async () => { setBusy("withdraw"); const ok = await withdrawRestaurantFromAmbassadorUgcAction(); setBusy(""); setNotice(ok ? "Le restaurant a été retiré du répertoire." : "Impossible de retirer la fiche."); if (ok) router.refresh(); }} loading={busy === "withdraw"}>Retirer mon restaurant du répertoire</Button>}</div>}
      </Card>

      <Card>
        <CardHeader eyebrow="Mode d’emploi" title="Simple et transparent" />
        <ol className="grid gap-3 text-[12px] leading-relaxed text-mv-ink-soft sm:grid-cols-3"><Step n="1" title="Rejoignez" text="Activez gratuitement votre compte et partagez votre lien personnel." /><Step n="2" title="Aidez à choisir" text="Présentez les outils avec une démo sincère; les owners gardent leur essai de 14 jours." /><Step n="3" title="Recevez" text="Après le premier paiement et 30 jours, demandez un transfert Stripe sécurisé." /></ol>
      </Card>
      {notice && <p role="status" className="rounded-lg bg-mv-cream-soft px-3 py-2 text-[12px] text-mv-ink-soft">{notice}</p>}
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-lg border border-mv-border-soft p-3"><span className="text-mv-green-dark">{icon}</span><p className="mt-2 text-[12.5px] font-semibold text-mv-ink">{title}</p><p className="mt-1 text-[11.5px] leading-relaxed text-mv-ink-soft">{text}</p></div>; }
function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3"><p className="text-[11px] text-mv-ink-faint">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-mv-ink">{value}</p></div>; }
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <li className="flex gap-3 rounded-xl border border-mv-border-soft p-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-mv-green/10 font-semibold text-mv-green-dark">{n}</span><span><strong className="block text-mv-ink">{title}</strong>{text}</span></li>; }
