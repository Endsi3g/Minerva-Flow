"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/Modal";
import {
  getLoyaltyTier,
  loyaltyTierLabel,
  loyaltyTierBadge,
  type LoyaltyTier,
  type LoyaltyTierThresholds,
} from "@/lib/loyalty-tiers";
import { LogoMark } from "@/components/shell/Logo";
import { formatCurrency, formatDate, roundToCents, cn } from "@/lib/utils";
import type { Customer, CustomerReferralLink, LoyaltyReward, MenuItem, Offer, ReferralProgram, RewardRedemption } from "@/lib/types";
import type { PortalData, PortalReferralProgress } from "@/lib/data/customer-portal";
import {
  getOrCreateReferralLinkAction,
  updateMyProfileAction,
  selfRedeemRewardAction,
  submitPortalOrderAction,
} from "./actions";
import {
  Copy,
  Check,
  Gift,
  Share2,
  Sparkles,
  ChefHat,
  Tag,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  MessageCircle,
  QrCode,
  Smartphone,
  Home,
  UtensilsCrossed,
  User,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type PortalTab = "home" | "order" | "rewards" | "profile";

const walletTierBg: Record<LoyaltyTier, string> = {
  habitue: "bg-mv-ink text-mv-cream",
  privilegie: "bg-mv-green-dark text-mv-cream",
  ambassadeur: "bg-mv-lime text-mv-green-darker",
};

/**
 * The card is the reason someone opens this portal at all, so its number
 * (Von Restorff: one dominant figure, everything else quieter) and its
 * "what do I do next" action sit together — ordering is the single most
 * likely next step after checking a balance, so the CTA lives right on the
 * card instead of forcing a second decision about where to find it (Fitts's
 * Law: the next action stays where attention already is).
 */
function LoyaltyWalletCard({
  customerId,
  points,
  visitCount,
  totalSpent,
  thresholds,
  appleWalletEnabled,
  googleWalletEnabled,
  onOrderClick,
}: {
  customerId: string;
  points: number;
  visitCount: number;
  totalSpent: number;
  thresholds: LoyaltyTierThresholds;
  appleWalletEnabled: boolean;
  googleWalletEnabled: boolean;
  onOrderClick: () => void;
}) {
  const t = useTranslations("portal.view");
  const tier = getLoyaltyTier(totalSpent, thresholds);
  const { icon: Icon } = loyaltyTierBadge[tier];

  function handleUnavailableWallet(platform: string) {
    toast.info(`Ajout à ${platform} bientôt disponible — le restaurant doit d'abord l'activer.`);
  }

  const prevTarget = tier === "ambassadeur" ? thresholds.tier3 : tier === "privilegie" ? thresholds.tier2 : 0;
  const nextTarget = tier === "habitue" ? thresholds.tier2 : tier === "privilegie" ? thresholds.tier3 : null;
  const progress = nextTarget ? Math.min(1, Math.max(0, (totalSpent - prevTarget) / (nextTarget - prevTarget))) : 1;

  return (
    <div className={`overflow-hidden rounded-3xl p-6 shadow-mv-lg ${walletTierBg[tier]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{t("points")}</p>
          <p className="mt-1 font-display text-[44px] font-medium leading-none tabular-nums">{points}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold">
          <Icon size={14} /> {loyaltyTierLabel[tier]}
        </div>
      </div>

      {nextTarget !== null && (
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] opacity-80">
            {formatCurrency(Math.max(0, nextTarget - totalSpent))} avant le palier suivant
          </p>
        </div>
      )}

      <div className="mt-5 flex items-center gap-5 border-t border-white/15 pt-4 text-[12px] opacity-90">
        <span>
          {visitCount} {t("visits").toLowerCase()}
        </span>
        <span>{formatCurrency(totalSpent)}</span>
      </div>

      <button
        type="button"
        onClick={onOrderClick}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-[14px] font-semibold text-mv-ink shadow-mv-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <UtensilsCrossed size={16} /> {t("homeOrderCta")}
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        {googleWalletEnabled ? (
          <a
            href={`/api/wallet/google?customerId=${customerId}`}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold transition-colors hover:bg-white/25"
          >
            <Smartphone size={13} /> Google Wallet
          </a>
        ) : (
          <button
            type="button"
            onClick={() => handleUnavailableWallet("Google Wallet")}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold opacity-70 transition-colors hover:opacity-90"
          >
            <Smartphone size={13} /> Google Wallet
          </button>
        )}
        {appleWalletEnabled ? (
          <a
            href={`/api/wallet/apple?customerId=${customerId}`}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold transition-colors hover:bg-white/25"
          >
            <Smartphone size={13} /> Apple Wallet
          </a>
        ) : (
          <button
            type="button"
            onClick={() => handleUnavailableWallet("Apple Wallet")}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold opacity-70 transition-colors hover:opacity-90"
          >
            <Smartphone size={13} /> Apple Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileSettingsCard({ customer }: { customer: Customer }) {
  const [birthday, setBirthday] = useState(customer.birthday ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [marketingConsent, setMarketingConsent] = useState(customer.marketingConsent);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const ok = await updateMyProfileAction(customer.id, {
        marketingConsent,
        birthday: birthday || null,
        city: city.trim() || null,
      });
      if (ok) {
        toast.success("Profil mis à jour.");
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1800);
      } else {
        toast.error("La mise à jour a échoué. Vos changements sont toujours dans le formulaire — réessayez.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Mon profil" description="Reçois des offres personnalisées et un cadeau le jour de ton anniversaire." />
      <div className="space-y-3">
        <Field label="Date de naissance" hint="Optionnel">
          <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </Field>
        <Field label="Ville" hint="Optionnel — aide le restaurant à savoir d'où viennent ses clients">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Montréal" />
        </Field>
        <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
          <Checkbox
            checked={marketingConsent}
            onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <span>J&apos;accepte de recevoir des offres et rappels par courriel ou SMS.</span>
        </label>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Enregistrement…" : savedTick ? "Enregistré ✓" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function PeerQrModal({
  open,
  onClose,
  shareUrl,
  programName,
}: {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  programName: string;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (open && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 600,
        margin: 2,
        color: { dark: "#062419", light: "#FFFFFF" },
      }).then(setQrUrl);
    }
  }, [open, shareUrl]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Faire scanner à table"
      description="Votre ami peut scanner ce QR Code directement depuis l'appareil photo de son smartphone."
    >
      <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
        <p className="text-[13px] font-semibold text-mv-ink">{programName}</p>
        <div className="rounded-2xl border-4 border-mv-green/30 bg-white p-4 shadow-xl">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR Code Parrainage" className="h-60 w-60 object-contain" />
          ) : (
            <div className="h-60 w-60 flex items-center justify-center">
              <QrCode size={32} className="animate-spin text-mv-ink-faint" />
            </div>
          )}
        </div>
        <p className="text-[12px] text-mv-ink-soft max-w-xs">
          ✦ Les points et récompenses seront automatiquement crédités dès sa première visite ✦
        </p>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Fermer
        </Button>
      </div>
    </Modal>
  );
}

function ReferralProgramCard({
  program,
  link,
  restaurantName,
  onLinkCreated,
}: {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
  restaurantName?: string;
  onLinkCreated: (link: CustomerReferralLink) => void;
}) {
  const t = useTranslations("portal.view");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  async function handleGetLink() {
    setIsCreating(true);
    try {
      const created = await getOrCreateReferralLinkAction(program.id);
      if (created) onLinkCreated(created);
      else toast.error(t("linkCreateFailed"));
    } finally {
      setIsCreating(false);
    }
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${link?.code}`
    : `https://minerva-flow.vercel.app/p/${link?.code}`;

  const shareText = `Je t'invite chez ${restaurantName || "notre restaurant"} ! Utilise mon lien pour découvrir la carte et recevoir ton cadeau de bienvenue : ${shareUrl}`;

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Lien copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Invitation de parrainage — ${program.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      handleCopy();
    }
  }

  function handleWhatsAppShare() {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  }

  function handleSmsShare() {
    const encoded = encodeURIComponent(shareText);
    window.location.href = `sms:?&body=${encoded}`;
  }

  const progress = link ? Math.min(1, link.convertedCount / program.goalCount) : 0;

  return (
    <Card>
      <CardHeader title={program.name} description={program.description ?? undefined} />
      {link ? (
        <div className="space-y-4">
          {/* Quick Viral Share Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366]/10 px-3 py-2.5 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={handleSmsShare}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-500/20 transition-colors"
            >
              <Smartphone size={14} /> SMS
            </button>
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-mv-ink/[0.06] px-3 py-2.5 text-[12px] font-semibold text-mv-ink hover:bg-mv-ink/[0.1] transition-colors"
            >
              <Share2 size={14} /> Partager
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-mv-green-tint px-3 py-2.5 text-[12px] font-semibold text-mv-green-dark hover:bg-mv-green-tint/80 transition-colors"
            >
              <QrCode size={14} /> Scanner
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-mv-border-soft bg-mv-cream-soft px-3 py-2">
            <span className="flex-1 truncate font-mono text-[11.5px] text-mv-ink-soft">{shareUrl}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 text-mv-ink-faint hover:text-mv-ink transition-colors p-1.5"
              aria-label={t("copyLinkAria")}
            >
              {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
            </button>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[12px] text-mv-ink-soft">
              <span>
                {link.convertedCount} / {program.goalCount} amis parrainés
              </span>
              {link.rewardClaimedAt && <Badge tone="green">{t("rewardUnlocked")}</Badge>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mv-ink/[0.08]">
              <div className="h-full rounded-full bg-mv-green transition-all" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          </div>

          {program.rewardDescription && (
            <p className="flex items-center gap-1.5 text-[12px] text-mv-ink-faint">
              <Gift size={13} className="text-mv-green" /> Récompense : {program.rewardDescription}
            </p>
          )}

          <PeerQrModal
            open={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            shareUrl={shareUrl}
            programName={program.name}
          />
        </div>
      ) : (
        <Button size="sm" onClick={handleGetLink} disabled={isCreating}>
          {isCreating ? t("creating") : t("getMyLink")}
        </Button>
      )}
    </Card>
  );
}

function RewardsRedeemCard({
  rewards,
  points,
  redemptions,
  onRedeemed,
}: {
  rewards: LoyaltyReward[];
  points: number;
  redemptions: RewardRedemption[];
  onRedeemed: (redemption: RewardRedemption) => void;
}) {
  const t = useTranslations("portal.view");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  async function handleRedeem(reward: LoyaltyReward) {
    setRedeemingId(reward.id);
    try {
      const redemption = await selfRedeemRewardAction(reward.id);
      if (redemption) onRedeemed(redemption);
      else toast.error(t("redeemFailed"));
    } finally {
      setRedeemingId(null);
    }
  }

  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <Card>
      <CardHeader title={t("rewardsTitle")} description={t("points") + ` : ${points}`} />
      {rewards.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">{t("rewardsEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => {
            const affordable = points >= reward.pointsCost;
            return (
              <div
                key={reward.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-mv-border-soft px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-mv-ink">{reward.name}</p>
                  {reward.description && (
                    <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">{reward.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={affordable ? "green" : "neutral"}>{reward.pointsCost} pts</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!affordable || redeemingId === reward.id}
                    onClick={() => handleRedeem(reward)}
                  >
                    {affordable
                      ? t("redeemButton")
                      : t("redeemMissingPoints", { count: reward.pointsCost - points })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-mv-border-soft pt-3">
          <p className="text-[12px] font-semibold text-mv-ink-soft">{t("pendingRedemptionsTitle")}</p>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-mv-green-tint px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-mv-green-dark" />
                <span className="text-[12.5px] font-medium text-mv-green-darker">{r.rewardName}</span>
              </div>
              <span className="font-mono text-[15px] font-semibold tracking-wider text-mv-green-darker">
                {r.code}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function isOfferLive(offer: Offer, now = Date.now()) {
  if (!offer.active) return false;
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now) return false;
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return false;
  return true;
}

/** Home tab's discovery feed — offers live here (not buried in the ordering
 * screen) since checking "what's new" is a browsing action, distinct from
 * the deliberate task of building a cart. Each offer hands off to Order. */
function OffersFeed({ offers, onOrderClick }: { offers: Offer[]; onOrderClick: () => void }) {
  const t = useTranslations("portal.view");
  const liveOffers = useMemo(() => offers.filter((o) => isOfferLive(o)), [offers]);
  if (liveOffers.length === 0) return null;

  return (
    <div>
      <p className="mb-2.5 text-[13px] font-semibold text-mv-ink">{t("offersTitle")}</p>
      <div className="space-y-2">
        {liveOffers.map((offer) => (
          <button
            key={offer.id}
            type="button"
            onClick={onOrderClick}
            className="flex w-full items-center gap-3 rounded-2xl border border-mv-green/25 bg-mv-green-tint px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-mv-green-dark">
              <Tag size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-mv-green-darker">{offer.title}</p>
              {offer.description && <p className="truncate text-[11.5px] text-mv-green-dark">{offer.description}</p>}
            </div>
            <ArrowRight size={14} className="shrink-0 text-mv-green-dark" />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Browsing + ordering. Orders submit pay-on-site straight into the
 * restaurant's own /commandes queue (see submitPortalOrderAction) — same
 * entry point staff already use for a QR-code table order. Online payment
 * isn't wired here yet; that's a separate, bigger piece (see HANDOFF.md).
 */
function MenuBrowserCard({
  menuItems,
  cart,
  onQtyChange,
}: {
  menuItems: MenuItem[];
  cart: Record<string, number>;
  onQtyChange: (itemId: string, delta: number) => void;
}) {
  const t = useTranslations("portal.view");

  const byCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems.filter((i) => i.active)) {
      const key = item.category ?? t("menuUncategorized");
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [menuItems, t]);

  if (menuItems.filter((i) => i.active).length === 0) {
    return <p className="text-[12.5px] text-mv-ink-faint">{t("menuUncategorized")}</p>;
  }

  return (
    <div className="space-y-5">
      {Array.from(byCategory.entries()).map(([category, items]) => (
        <div key={category}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">{category}</p>
          <div className="space-y-2">
            {items.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
                    qty > 0 ? "border-mv-green/40 bg-mv-green-tint/40" : "border-transparent bg-mv-cream-soft"
                  )}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-mv-ink/5 text-mv-ink-faint">
                      <ChefHat size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-mv-ink">{item.name}</p>
                    {item.description && (
                      <p className="truncate text-[11.5px] text-mv-ink-faint">{item.description}</p>
                    )}
                    <span className="text-[12.5px] font-semibold text-mv-ink">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => onQtyChange(item.id, -1)}
                          aria-label="Retirer un"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-mv-border text-mv-ink-soft"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-[13.5px] font-semibold tabular-nums">{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => onQtyChange(item.id, 1)}
                      aria-label="Ajouter un"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const TIP_PRESETS = [0, 0.1, 0.15, 0.2];

function CheckoutModal({
  open,
  onClose,
  customerId,
  cartLines,
  taxRate,
  acceptsTips,
  onOrdered,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  cartLines: { item: MenuItem; quantity: number }[];
  taxRate: number;
  acceptsTips: boolean;
  onOrdered: () => void;
}) {
  const t = useTranslations("portal.view");
  const [tipPct, setTipPct] = useState<number | null>(acceptsTips ? 0.15 : null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const subtotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const taxAmount = roundToCents(subtotal * taxRate);
  const tipAmount = tipPct != null ? roundToCents(subtotal * tipPct) : 0;
  const total = subtotal + taxAmount + tipAmount;

  async function handleSubmit() {
    setStatus("submitting");
    const result = await submitPortalOrderAction(
      customerId,
      cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      tipAmount,
      paymentMethod.trim() || null
    );
    if (!result.ok) {
      setStatus("error");
      return;
    }
    onOrdered();
    setStatus("done");
  }

  function handleClose() {
    onClose();
    if (status === "done") setStatus("idle");
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("checkoutTitle")} width={480}>
      {status === "done" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <CheckCircle2 size={26} />
          </div>
          <p className="font-display text-[19px] font-medium text-mv-ink">{t("orderSuccessTitle")}</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-mv-ink-soft">{t("orderSuccessDescription")}</p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-[12px] text-mv-ink-faint">
            <Clock size={13} /> Vous recevrez une notification dès la confirmation.
          </div>
          <Button size="sm" variant="secondary" className="mt-5" onClick={handleClose}>
            {t("orderClose")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            {cartLines.map((l) => (
              <div key={l.item.id} className="flex items-center justify-between text-[12.5px]">
                <span className="text-mv-ink-soft">
                  {l.quantity}× {l.item.name}
                </span>
                <span className="font-medium text-mv-ink">{formatCurrency(l.item.price * l.quantity)}</span>
              </div>
            ))}
          </div>

          {acceptsTips && (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">{t("checkoutTip")}</p>
              <div className="flex gap-1.5">
                {TIP_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipPct(pct)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-2 text-[12px] font-medium",
                      tipPct === pct
                        ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                        : "border-mv-border text-mv-ink-soft"
                    )}
                  >
                    {pct === 0 ? t("checkoutTipNone") : `${Math.round(pct * 100)}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 border-t border-mv-border-soft pt-3 text-[12.5px]">
            <div className="flex justify-between text-mv-ink-soft">
              <span>{t("checkoutSubtotal")}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-mv-ink-soft">
              <span>{t("checkoutTaxes")}</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            {acceptsTips && (
              <div className="flex justify-between text-mv-ink-soft">
                <span>{t("checkoutTip")}</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-semibold text-mv-ink">
              <span>{t("checkoutTotal")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Field label={t("paymentMethodLabel")} hint={t("paymentMethodHint")}>
            <Input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder={t("paymentMethodPlaceholder")}
            />
          </Field>

          {status === "error" && <p className="text-[12.5px] text-mv-red">{t("orderError")}</p>}

          <Button onClick={handleSubmit} disabled={status === "submitting"} className="w-full">
            {status === "submitting" ? t("orderSubmitting") : t("orderSubmit", { total: formatCurrency(total) })}
          </Button>
        </div>
      )}
    </Modal>
  );
}

const TAB_ORDER: PortalTab[] = ["home", "order", "rewards", "profile"];

function BottomTabBar({
  active,
  onChange,
  cartCount,
  labels,
}: {
  active: PortalTab;
  onChange: (tab: PortalTab) => void;
  cartCount: number;
  labels: Record<PortalTab, string>;
}) {
  const icons: Record<PortalTab, typeof Home> = {
    home: Home,
    order: UtensilsCrossed,
    rewards: Gift,
    profile: User,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-mv-border bg-mv-surface/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-2xl">
        {TAB_ORDER.map((tab) => {
          const Icon = icons[tab];
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors"
              style={{ color: isActive ? "var(--mv-green-dark)" : "var(--mv-ink-faint)" }}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                {tab === "order" && cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mv-red px-1 text-[9.5px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </span>
              {labels[tab]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function PortalView({
  customer,
  data,
  loyaltyTierThresholds,
  menuItems,
  offers,
  taxRate,
  acceptsTips,
  restaurantName,
  appleWalletEnabled,
  googleWalletEnabled,
}: {
  customer: Customer;
  data: PortalData;
  loyaltyTierThresholds: LoyaltyTierThresholds;
  menuItems: MenuItem[];
  offers: Offer[];
  taxRate: number;
  acceptsTips: boolean;
  restaurantName?: string | null;
  appleWalletEnabled: boolean;
  googleWalletEnabled: boolean;
}) {
  const t = useTranslations("portal.view");
  const [activeTab, setActiveTab] = useState<PortalTab>("home");
  const [programs, setPrograms] = useState<PortalReferralProgress[]>(data.programs);
  const [points, setPoints] = useState(customer.loyaltyPoints);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(data.redemptions);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function handleLinkCreated(programId: string, link: CustomerReferralLink) {
    setPrograms((prev) => prev.map((p) => (p.program.id === programId ? { ...p, link } : p)));
  }

  function handleRedeemed(redemption: RewardRedemption) {
    setPoints((prev) => prev - redemption.pointsSpent);
    setRedemptions((prev) => [redemption, ...prev]);
    toast.success(t("redeemSuccessTitle"));
  }

  function handleQtyChange(itemId: string, delta: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta) }));
  }

  function handleOrdered() {
    setCart({});
  }

  const cartLines = menuItems
    .filter((i) => (cart[i.id] ?? 0) > 0)
    .map((i) => ({ item: i, quantity: cart[i.id] }));
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const hasActiveMenu = menuItems.some((i) => i.active);

  const tabLabels: Record<PortalTab, string> = {
    home: t("tabHome"),
    order: t("tabOrder"),
    rewards: t("rewardsTitle"),
    profile: t("tabProfile"),
  };

  return (
    <div className="min-h-screen bg-mv-cream pb-28">
      <div className="mx-auto max-w-2xl px-6 pb-6 pt-10">
        <div className="mb-6 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-sans text-[16px] font-medium text-mv-ink">
              Flow <span className="text-mv-green-dark">par Minerva</span>
            </span>
          </div>
          {restaurantName && (
            <span className="rounded-full border border-mv-border bg-mv-surface px-3 py-1 text-[11.5px] font-semibold text-mv-ink-soft">
              {restaurantName}
            </span>
          )}
        </div>

        {activeTab === "home" && (
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-mv-green-dark">{t("spaceLabel")}</p>
              <h1 className="font-display text-[26px] font-medium text-mv-ink">{t("greeting", { name: customer.name })}</h1>
            </div>

            <LoyaltyWalletCard
              customerId={customer.id}
              points={points}
              visitCount={customer.visitCount}
              totalSpent={customer.totalSpent}
              thresholds={loyaltyTierThresholds}
              appleWalletEnabled={appleWalletEnabled}
              googleWalletEnabled={googleWalletEnabled}
              onOrderClick={() => setActiveTab("order")}
            />

            <OffersFeed offers={offers} onOrderClick={() => setActiveTab("order")} />

            {data.rewards.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("rewards")}
                className="flex w-full items-center justify-between rounded-2xl border border-mv-border bg-mv-surface px-4 py-3.5 text-left shadow-mv-sm transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-lime-tint text-mv-green-dark">
                    <Gift size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-mv-ink">{t("rewardsTitle")}</p>
                    <p className="text-[11.5px] text-mv-ink-faint">
                      {data.rewards.length} récompense{data.rewards.length > 1 ? "s" : ""} disponible
                      {data.rewards.length > 1 ? "s" : ""} avec vos {points} pts
                    </p>
                  </div>
                </div>
                <ArrowRight size={15} className="shrink-0 text-mv-ink-faint" />
              </button>
            )}

            {data.transactions.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-mv-ink">{t("historyTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="text-[12px] font-semibold text-mv-green-dark hover:underline"
                  >
                    Tout voir
                  </button>
                </div>
                <div className="space-y-1.5">
                  {data.transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg bg-mv-cream-soft px-3 py-2.5">
                      <div>
                        <p className="text-[12.5px] font-medium text-mv-ink">{t(`txLabel.${tx.type}`)}</p>
                        <p className="text-[11px] text-mv-ink-faint">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span
                        className={
                          tx.pointsDelta >= 0
                            ? "text-[12.5px] font-semibold text-mv-green-dark"
                            : "text-[12.5px] font-semibold text-mv-red"
                        }
                      >
                        {tx.pointsDelta >= 0 ? "+" : ""}
                        {tx.pointsDelta} {t("pts")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "order" && (
          <div>
            <h1 className="mb-1 font-display text-[24px] font-medium text-mv-ink">{t("menuTitle")}</h1>
            <p className="mb-5 text-[13px] text-mv-ink-soft">{t("menuDescription")}</p>
            {hasActiveMenu ? (
              <Card>
                <MenuBrowserCard menuItems={menuItems} cart={cart} onQtyChange={handleQtyChange} />
              </Card>
            ) : (
              <p className="text-[12.5px] text-mv-ink-faint">Aucun plat disponible pour l&apos;instant.</p>
            )}
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-5">
            <h1 className="font-display text-[24px] font-medium text-mv-ink">{t("rewardsTitle")}</h1>
            <RewardsRedeemCard rewards={data.rewards} points={points} redemptions={redemptions} onRedeemed={handleRedeemed} />
            {programs.length > 0 && (
              <div className="space-y-4">
                <p className="text-[13px] font-semibold text-mv-ink">{t("referralProgramsTitle")}</p>
                {programs.map(({ program, link }) => (
                  <ReferralProgramCard
                    key={program.id}
                    program={program}
                    link={link}
                    restaurantName={restaurantName ?? undefined}
                    onLinkCreated={(created) => handleLinkCreated(program.id, created)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-5">
            <h1 className="font-display text-[24px] font-medium text-mv-ink">{t("tabProfile")}</h1>
            <ProfileSettingsCard customer={customer} />
            <Card>
              <CardHeader title={t("historyTitle")} description={t("transactionsCount", { count: data.transactions.length })} />
              {data.transactions.length === 0 ? (
                <p className="text-[12.5px] text-mv-ink-faint">{t("noTransactions")}</p>
              ) : (
                <div className="space-y-2">
                  {data.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg bg-mv-cream-soft px-3 py-2.5">
                      <div>
                        <p className="text-[12.5px] font-medium text-mv-ink">{t(`txLabel.${tx.type}`)}</p>
                        <p className="text-[11px] text-mv-ink-faint">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span
                        className={
                          tx.pointsDelta >= 0
                            ? "text-[12.5px] font-semibold text-mv-green-dark"
                            : "text-[12.5px] font-semibold text-mv-red"
                        }
                      >
                        {tx.pointsDelta >= 0 ? "+" : ""}
                        {tx.pointsDelta} {t("pts")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {cartCount > 0 && activeTab === "order" && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-6" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <button
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 rounded-2xl bg-mv-green px-5 py-3.5 text-[13.5px] font-semibold text-mv-cream-soft shadow-mv-lg transition-colors hover:bg-mv-green-dark"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={16} /> {t("cartItemCount", { count: cartCount })}
            </span>
            <span className="flex items-center gap-1">
              {formatCurrency(cartSubtotal)} <ArrowRight size={14} />
            </span>
          </button>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        customerId={customer.id}
        cartLines={cartLines}
        taxRate={taxRate}
        acceptsTips={acceptsTips}
        onOrdered={handleOrdered}
      />

      <BottomTabBar active={activeTab} onChange={setActiveTab} cartCount={cartCount} labels={tabLabels} />
    </div>
  );
}
