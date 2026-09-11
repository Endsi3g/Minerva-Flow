"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  Coffee,
  Gift,
  Star,
  Share2,
  HeartHandshake,
} from "lucide-react";
import {
  getPrioritizedCampaignSettingsAction,
  updateCampaignTriggerSettingAction,
  dispatchOffPeakBroadcastAction,
  type PrioritizedCampaignSettings,
  type CampaignTriggerKey,
} from "@/app/[locale]/(app)/campaigns/actions";

export function PrioritizedCampaignsStudio({
  restaurantId,
  restaurantName = "Votre établissement",
}: {
  restaurantId: string;
  restaurantName?: string;
}) {
  const [settings, setSettings] = useState<PrioritizedCampaignSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Off-peak broadcast form states
  const [timeSlot, setTimeSlot] = useState("Mardi midi");
  const [customOffer, setCustomOffer] = useState("un dessert offert pour votre table");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getPrioritizedCampaignSettingsAction(restaurantId)
      .then(setSettings)
      .finally(() => setLoading(false));
  }, [restaurantId]);

  function handleToggle(key: CampaignTriggerKey) {
    if (!settings || !restaurantId) return;
    const settingMap: Record<CampaignTriggerKey, keyof PrioritizedCampaignSettings> = {
      welcome: "campaignWelcomeEnabled",
      second_visit: "campaignSecondVisitEnabled",
      reactivation_21d: "campaignReactivation21dEnabled",
      reward_available: "campaignRewardAvailableEnabled",
      vip_upgrade: "campaignVipUpgradeEnabled",
      referral_share: "campaignReferralShareEnabled",
      winback_60d: "campaignWinback60dEnabled",
    };
    const prop = settingMap[key];
    const current = Boolean(settings[prop]);
    const next = !current;

    // Optimistic UI update
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            [prop]: next,
          }
        : null
    );

    startTransition(async () => {
      const res = await updateCampaignTriggerSettingAction(restaurantId, key, next);
      if (res.ok) {
        toast.success(
          next
            ? `Campagne activée : envoi automatique opérationnel`
            : `Campagne désactivée`
        );
      } else {
        toast.error("Impossible de mettre à jour le statut de la campagne.");
      }
    });
  }

  async function handleBroadcastOffPeak() {
    if (!restaurantId) return;
    setIsBroadcasting(true);
    try {
      const result = await dispatchOffPeakBroadcastAction(restaurantId, timeSlot, customOffer);
      if (result.ok) {
        if (result.sentCount > 0) {
          toast.success(
            `Campagne Période creuse envoyée à ${result.sentCount} client(s) consentant(s) (LCAP).`
          );
        } else {
          toast.info(result.message || "Aucun client consenti éligible pour cet envoi.");
        }
      } else {
        toast.error("Échec de la diffusion de la campagne.");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsBroadcasting(false);
    }
  }

  const consentStats = settings?.consentStats;
  const optInPercent = consentStats?.totalCustomers
    ? Math.round((consentStats.marketingOptInCount / consentStats.totalCustomers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* LCAP / CASL Canadian Compliance Metric Card */}
      <Card className="border-mv-green-dark/20 bg-gradient-to-br from-mv-surface via-mv-cream to-mv-surface shadow-mv-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge tone="green" className="gap-1.5 px-2.5 py-1">
                <ShieldCheck size={13} />
                <span>Standard LCAP / CASL Canadien Certifié</span>
              </Badge>
              <span className="text-[12px] text-mv-ink-faint">
                Minerva Technologies Inc. · Montréal
              </span>
            </div>
            <h3 className="font-display text-[19px] font-semibold text-mv-ink">
              Registre Légal & Preuves de Consentement
            </h3>
            <p className="max-w-2xl text-[13px] text-mv-ink-soft">
              Chaque envoi marketing vérifie automatiquement le consentement explicite. Tout désabonnement par mot-clé SMS (STOP, ARRÊT) ou lien web est enregistré dans le registre d&apos;audit immuable.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-mv-border bg-mv-surface p-3.5 shadow-mv-xs">
            <div className="text-center">
              <p className="font-mono text-[20px] font-bold text-mv-green-dark">
                {consentStats?.marketingOptInCount ?? "—"}
              </p>
              <p className="text-[11px] font-medium text-mv-ink-soft">Marketing validé</p>
            </div>
            <div className="h-8 w-px bg-mv-border-soft" />
            <div className="text-center">
              <p className="font-mono text-[20px] font-bold text-mv-ink">
                {consentStats?.serviceOnlyCount ?? "—"}
              </p>
              <p className="text-[11px] font-medium text-mv-ink-soft">Service seul</p>
            </div>
            <div className="h-8 w-px bg-mv-border-soft" />
            <div className="text-center">
              <p className="font-mono text-[20px] font-bold text-mv-amber-dark">
                {optInPercent}%
              </p>
              <p className="text-[11px] font-medium text-mv-ink-soft">Taux d&apos;opt-in</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid of the 4 Ready-to-Use Prioritized Campaigns */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mv-green" />
            <h2 className="font-display text-[20px] font-semibold text-mv-ink">
              Modèles Prêts à l&apos;Emploi
            </h2>
          </div>
          <p className="text-[13px] text-mv-ink-soft">
            Les campagnes à plus fort retour sur investissement, pré-rédigées et entièrement conformes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 1. BIENVENUE */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      1. Bienvenue
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · Dès l&apos;inscription
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignWelcomeEnabled ? "green" : "neutral"}>
                  {settings?.campaignWelcomeEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Envoyée immédiatement après l’inscription au comptoir ou via QR code pour ancrer la relation dès le premier jour.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Bienvenue chez {restaurantName}. Votre première récompense vous attend à votre prochaine visite. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Déclenchement automatique 24/7
              </span>
              <Button
                size="sm"
                variant={settings?.campaignWelcomeEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("welcome")}
                disabled={isPending || loading}
              >
                {settings?.campaignWelcomeEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 2. DEUXIÈME VISITE */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      2. Deuxième visite
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · 3 à 5 jours après la 1ère visite
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignSecondVisitEnabled ? "green" : "neutral"}>
                  {settings?.campaignSecondVisitEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Envoyée quelques jours après la première visite si le client n’est pas revenu, transformant un passant en habitué.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Il ne vous manque qu’une visite pour débloquer votre prochaine récompense. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Condition : 1 visite enregistrée sans retour
              </span>
              <Button
                size="sm"
                variant={settings?.campaignSecondVisitEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("second_visit")}
                disabled={isPending || loading}
              >
                {settings?.campaignSecondVisitEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 3. RÉACTIVATION (21 JOURS) */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      3. Réactivation (21 jours)
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · Seuil d&apos;attrition critique
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignReactivation21dEnabled ? "green" : "neutral"}>
                  {settings?.campaignReactivation21dEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Déclenchée après 21 jours d’absence. Évite la perte définitive d&apos;un client en lui réservant son statut d&apos;habitué.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Cela fait un moment qu’on ne vous a pas vu. Revenez cette semaine et profitez de votre offre réservée aux habitués. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Déclencheur d&apos;inactivité LCAP
              </span>
              <Button
                size="sm"
                variant={settings?.campaignReactivation21dEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("reactivation_21d")}
                disabled={isPending || loading}
              >
                {settings?.campaignReactivation21dEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 4. PÉRIODE CREUSE */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all bg-mv-surface">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                    <Coffee size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      4. Période creuse
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Diffusion ciblée · Segment & plage horaire précise
                    </p>
                  </div>
                </div>
                <Badge tone="amber">Diffusion manuelle</Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Envoyée uniquement pour un segment et une plage horaire précise pour remplir vos tables pendant les services calmes.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-mv-ink-faint">Plage horaire</label>
                  <Select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="h-8 text-[12px] mt-0.5"
                  >
                    <option value="Mardi midi">Mardi midi</option>
                    <option value="Mercredi après-midi">Mercredi après-midi</option>
                    <option value="Jeudi midi">Jeudi midi</option>
                    <option value="Dimanche soir">Dimanche soir</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-mv-ink-faint">Offre exclusive</label>
                  <Input
                    value={customOffer}
                    onChange={(e) => setCustomOffer(e.target.value)}
                    placeholder="Ex : café offert"
                    className="h-8 text-[12px] mt-0.5"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message
                </p>
                <p className="font-serif text-[13px] italic text-mv-ink leading-relaxed">
                  « {timeSlot} est plus calme que d’habitude. Invitez vos clients inactifs à revenir avec une offre limitée : {customOffer}. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                {consentStats?.marketingOptInCount ?? 0} destinataire(s) consentant(s)
              </span>
              <Button
                size="sm"
                onClick={handleBroadcastOffPeak}
                disabled={isBroadcasting || (consentStats?.marketingOptInCount ?? 0) === 0}
                className="gap-1.5"
              >
                <Send size={13} />
                {isBroadcasting ? "Envoi en cours…" : "Diffuser maintenant"}
              </Button>
            </div>
          </Card>

          {/* 5. RÉCOMPENSE DISPONIBLE */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                    <Gift size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      5. Récompense disponible
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · Dès qu&apos;une offre est débloquée
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignRewardAvailableEnabled ? "green" : "neutral"}>
                  {settings?.campaignRewardAvailableEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Déclenchée dès qu&apos;un client franchit un palier de points ou de visites éligible à un cadeau au comptoir.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Félicitations, votre récompense vous attend chez {restaurantName} ! Venez en profiter lors de votre prochaine visite. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Déclenchement automatique au comptoir
              </span>
              <Button
                size="sm"
                variant={settings?.campaignRewardAvailableEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("reward_available")}
                disabled={isPending || loading}
              >
                {settings?.campaignRewardAvailableEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 6. NOUVEAU STATUT PRIVILÉGIÉ */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Star size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      6. Statut Privilégié / Ambassadeur
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · Célébration de palier supérieur
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignVipUpgradeEnabled ? "green" : "neutral"}>
                  {settings?.campaignVipUpgradeEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Félicite chaleureusement le client dès qu&apos;il franchit les seuils Privilégié ou Ambassadeur, renforçant sa fierté d&apos;appartenance.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Bravo, vous accédez au statut Privilégié chez {restaurantName}. Des privilèges exclusifs vous attendent en restaurant. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Déclenchement au passage de seuil
              </span>
              <Button
                size="sm"
                variant={settings?.campaignVipUpgradeEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("vip_upgrade")}
                disabled={isPending || loading}
              >
                {settings?.campaignVipUpgradeEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 7. PARTAGE & PARRAINAGE */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                    <Share2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      7. Partage & Parrainage
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation / Ciblé · Habitués réguliers (≥ 2 visites)
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignReferralShareEnabled ? "green" : "neutral"}>
                  {settings?.campaignReferralShareEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Invite vos clients conquis à recommander l&apos;établissement à leurs collègues et amis avec leur lien de parrainage unique.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Faites découvrir {restaurantName} à vos proches ! Partagez votre lien et recevez tous les deux un cadeau. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Envoyée aux habitués satisfaits
              </span>
              <Button
                size="sm"
                variant={settings?.campaignReferralShareEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("referral_share")}
                disabled={isPending || loading}
              >
                {settings?.campaignReferralShareEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>

          {/* 8. DERNIÈRE CHANCE (60 JOURS) */}
          <Card className="flex flex-col justify-between border-mv-border hover:border-mv-green/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                    <HeartHandshake size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                      8. Dernière chance (60 jours)
                    </h3>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      Automation · Réactivation prolongée
                    </p>
                  </div>
                </div>
                <Badge tone={settings?.campaignWinback60dEnabled ? "green" : "neutral"}>
                  {settings?.campaignWinback60dEnabled ? "Activée (Auto)" : "Désactivée"}
                </Badge>
              </div>

              <p className="text-[13px] text-mv-ink-soft">
                Dernière perche tendue aux clients inactifs depuis 2 mois avec une offre d&apos;accueil personnalisée avant l&apos;archivage.
              </p>

              <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1">
                  Aperçu du message (SMS & Courriel)
                </p>
                <p className="font-serif text-[13.5px] italic text-mv-ink leading-relaxed">
                  « Vous nous manquez chez {restaurantName} ! Venez nous voir ce mois-ci pour une surprise spéciale retrouvailles. »
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Déclenchement à J+60 sans visite
              </span>
              <Button
                size="sm"
                variant={settings?.campaignWinback60dEnabled ? "secondary" : "primary"}
                onClick={() => handleToggle("winback_60d")}
                disabled={isPending || loading}
              >
                {settings?.campaignWinback60dEnabled ? "Désactiver" : "Activer en 1 clic"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* 9. Anniversaire Note (Post-MVP) */}
      <Card className="border-dashed border-mv-border bg-mv-cream-soft/40">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-border-soft text-mv-ink-soft">
            <Calendar size={16} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-[15px] font-medium text-mv-ink">
                9. Anniversaire (À ajouter après le MVP)
              </h4>
              <Badge tone="neutral" className="text-[10.5px]">Post-MVP</Badge>
            </div>
            <p className="text-[12.5px] text-mv-ink-soft">
              Cette fonctionnalité est délibérément planifiée après le MVP car elle requiert la collecte d’une donnée personnelle supplémentaire (date de naissance) et une gestion plus précise des préférences clients en conformité LCAP.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
