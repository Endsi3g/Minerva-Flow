"use client";


import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Customer } from "@/lib/types";
import { type LoyaltyTierThresholds, getLoyaltyTier } from "@/lib/loyalty-tiers";
import { getDaysUntilBirthday } from "@/lib/loyalty/birthday";
import { LoyaltyTierBadge } from "@/components/minerva/LoyaltyTierBadge";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { TablePagination } from "@/components/minerva/TablePagination";
import { CustomerOriginCard } from "@/components/fidelisation/CustomerOriginCard";
import { getCustomerOriginByCity } from "@/lib/customer-origin";
import { Plus, Search, Check, Gift, Cake, CreditCard, Sparkles, Copy, Download, Megaphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  createCustomerAction,
  claimRewardRedemptionAction,
  grantBirthdayBonusAction,
  searchCustomerAtCounterAction,
  confirmCounterCustomerAction,
  type CounterCustomerResult,
  logVisitAction,
  sendAnnouncementAction,
} from "./actions";
import { notifyError } from "@/lib/notify-error";
import { toast } from "sonner";

function NewCustomerModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const t = useTranslations("fidelisationView");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const customer = await createCustomerAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        birthday: String(form.get("birthday") ?? "") || null,
        city: String(form.get("city") ?? "") || null,
        neighborhood: String(form.get("neighborhood") ?? "") || null,
        marketingConsent,
        consentSource: "staff",
      });
      if (customer) {
        onCreated(customer);
        onClose();
        (e.target as HTMLFormElement).reset();
        setMarketingConsent(false);
      } else {
        notifyError(t("couldNotAddThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("newCustomer")} description={t("createARecordTo")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("name")}>
          <Input name="name" placeholder={t("eGJaneTremblay")} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("email")} hint={t("optional")}>
            <Input name="email" type="email" />
          </Field>
          <Field label={t("phone")} hint={t("optional")}>
            <Input name="phone" type="tel" />
          </Field>
        </div>
        <Field label={t("notes")} hint={t("optionalAllergiesPreferences")}>
          <Input name="notes" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dateOfBirth")} hint={t("optional")}>
            <Input name="birthday" type="date" />
          </Field>
          <Field label={t("city")} hint={t("optionalWhereTheCustomer")}>
            <Input name="city" placeholder={t("eGMontreal")} />
          </Field>
          <Field label={t("neighborhood")} hint={t("optionalGeneralAreaOnly")}>
            <Input name="neighborhood" placeholder={t("eGPlateauMont")} maxLength={80} />
          </Field>
        </div>
        <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
          <Checkbox
            checked={marketingConsent}
            onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <span>{t("theCustomerAgreesTo")}</span>
        </label>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RewardValidationCard({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations("fidelisationView");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    rewardName: string;
    pointsSpent: number;
    customerName: string;
    claimedAt: string;
  } | null>(null);

  async function handleValidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const claimed = await claimRewardRedemptionAction(restaurantId, code);
      if (claimed) {
        setResult(claimed);
        setCode("");
      } else {
        notifyError(t("codeNotFoundOr"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("atTheCounter")}
        title={t("validateAReward")}
        description={t("theCustomerRedeemsTheir")}
      />
      <form onSubmit={handleValidate} className="flex flex-wrap items-end gap-2">
        <Field label={t("customerCode")}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex : A1B2C3"
            className="w-40 font-mono uppercase tracking-wider"
            maxLength={6}
          />
        </Field>
        <Button type="submit" size="sm" disabled={isSubmitting || !code.trim()}>
          <Check size={14} /> Valider
        </Button>
      </form>
      {result && (
        <div className="mv-check-pop mt-3 flex items-start gap-2.5 rounded-lg border border-mv-green/20 bg-mv-green-tint px-3 py-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-mv-green-dark" />
          <p className="text-[12.5px] leading-relaxed text-mv-green-darker">
            {t("rewardValidatedFor", { reward: result.rewardName, customer: result.customerName })}
            {" "}(-{result.pointsSpent} pts).
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Staff types the 6-digit rotating code shown on a customer's digital card
 * (MyCardView, native app) to identify them without a scan, then logs a
 * visit right in the same card — one panel instead of navigating to the
 * customer's own detail page first. Resolving and logging are two separate
 * calls (resolvePairingCodeAction, then the same logVisitAction the
 * customer detail page uses) rather than one combined action, so points
 * math stays in exactly one place.
 */
/**
 * Unified Cashier & Counter Identification Component
 * Allows looking up a customer via:
 * 1. Mobile phone number (or scanning QR code via USB barcode reader)
 * 2. 6-digit short pairing code
 * 3. Customer name
 */
function IdentificationAuComptoirCard({
  restaurantId,
  onVisitLogged,
}: {
  restaurantId: string;
  onVisitLogged: (updated: Customer) => void;
}) {
  const t = useTranslations("fidelisationView");
  const [query, setQuery] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [found, setFound] = useState<CounterCustomerResult | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const needsClientConfirmation = found?.matchedBy === "phone" || found?.matchedBy === "name";

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsResolving(true);
    setFound(null);
    setConfirmationError(null);
    try {
      const result = await searchCustomerAtCounterAction(restaurantId, query);
      if (result.error) {
        notifyError(result.error);
      } else if (result.customer) {
        setFound(result.customer);
        setQuery("");
      }
    } catch {
      notifyError(t("theSearchDidNot"));
    } finally {
      setIsResolving(false);
    }
  }

  async function confirmClientIdentity() {
    if (!found || confirmationCode.length !== 6) return;
    setIsConfirming(true);
    setConfirmationError(null);
    try {
      const confirmed = await confirmCounterCustomerAction(
        restaurantId,
        found.id,
        confirmationCode,
        found.matchedBy === "name" ? "name" : "phone"
      );
      if (!confirmed) {
        setConfirmationError(t("theCodeDoesNot"));
        return;
      }
      setFound(confirmed);
      setConfirmationCode("");
    } catch {
      setConfirmationError(t("theVerificationDidNot"));
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleLogVisit() {
    if (!found) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notifyError(t("enterAValidAmount"));
      return;
    }
    setIsLogging(true);
    try {
      const updated = await logVisitAction(
        restaurantId,
        found.id,
        parsed,
        "Visite comptoir",
        found.matchedBy === "code" || found.matchedBy === "verified",
        found.viaPhoneLookup ?? false
      );
      if (updated) {
        onVisitLogged(updated);
        toast.success(t("visitRecordedFor", { name: found.name }));
        setFound(null);
        setAmount("");
      } else {
        notifyError(t("couldNotRecordThe"));
      }
    } catch {
      notifyError(t("theVisitCouldNot"));
    } finally {
      setIsLogging(false);
    }
  }

  const queryTypeHint = useMemo(() => {
    const clean = query.trim().replace(/\D/g, "");
    if (query.trim().length === 6 && clean.length === 6) return t("pairingCode6Digits");
    if (clean.length >= 7) return t("phoneNumber");
    if (query.trim().length > 0) return t("searchByName");
    return null;
  }, [query, t]);

  return (
    <Card>
      <CardHeader
        eyebrow={t("atTheCounterRegister")}
        title={t("quickCustomerIdentification")}
        description={t("searchForTheCustomer")}
      />
      {!found ? (
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2.5">
          <Field
            label={t("phone6DigitCode")}
            hint={queryTypeHint ?? undefined}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex : (514) 555-1234 ou 123456"
              className="w-72 font-mono"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" size="sm" disabled={isResolving || !query.trim()}>
            {isResolving ? (
              <span className="animate-spin text-xs">●</span>
            ) : (
              <Search size={14} />
            )}
            Rechercher
          </Button>
        </form>
      ) : (
        <div className="mv-check-pop flex flex-col gap-3 rounded-lg border border-mv-green/20 bg-mv-green-tint/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mv-green/15 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mv-green text-xs font-semibold text-white">
                {found.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-mv-ink">{found.name}</p>
                <div className="flex items-center gap-2 text-xs text-mv-ink-soft">
                  {found.phone && <span>{formatPhoneDisplay(found.phone)}</span>}
                  <Badge variant="subtle" tone="green" size="sm">
                    {found.matchedBy === "phone"
                      ? t("phone")
                      : found.matchedBy === "verified"
                        ? t("identityConfirmed")
                      : found.matchedBy === "code"
                        ? "Code 6 chiffres"
                        : "Nom"}
                  </Badge>
                </div>
              </div>
            </div>

            {needsClientConfirmation ? (
              <p className="max-w-xs text-right text-[12px] text-mv-ink-soft">{t("askTheCustomerTo")}</p>
            ) : <div className="flex items-center gap-3 text-right text-xs text-mv-ink-soft">
              <div>
                <span className="block font-serif text-sm font-bold text-mv-green">
                  {found.loyaltyPoints} pts
                </span>
                <span>{found.visitCount} visites</span>
              </div>
              <div className="border-l border-mv-green/20 pl-3">
                <span className="block font-mono text-sm font-semibold text-mv-ink">
                  {formatCurrency(found.totalSpent)}
                </span>
                <span>{t("spent")}</span>
              </div>
            </div>}
          </div>

          {needsClientConfirmation ? (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <Field label={t("customerSTemporaryCode")} hint={t("scanTab6Digit")}>
                <Input value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="w-32 font-mono tracking-widest" />
              </Field>
              <Button type="button" size="sm" onClick={confirmClientIdentity} disabled={isConfirming || confirmationCode.length !== 6}>
                {isConfirming ? t("verifying") : t("confirmIdentity")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setFound(null); setConfirmationCode(""); }}>{t("changeCustomer")}</Button>
              {confirmationError && <p role="alert" className="basis-full text-[12px] text-mv-red">{confirmationError}</p>}
            </div>
          ) : <div className="flex flex-wrap items-end gap-2 pt-1">
            <Field label={t("billAmount")}>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-28 font-mono"
                inputMode="decimal"
                autoFocus
              />
            </Field>
            <Button
              type="button"
              size="sm"
              onClick={handleLogVisit}
              disabled={isLogging || !amount.trim()}
            >
              <CreditCard size={14} /> {t("recordVisitAndCredit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFound(null);
                setAmount("");
              }}
            >
              Changer de client
            </Button>
          </div>}
        </div>
      )}
    </Card>
  );
}

function DigitalLoyaltyPassModal({
  customer,
  restaurantName,
  rate,
  thresholds,
  open,
  onClose,
}: {
  customer: Customer | null;
  restaurantName: string;
  rate: number;
  thresholds: LoyaltyTierThresholds;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("fidelisationView");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const memberCode = `MEMBER-${customer.id.slice(0, 8).toUpperCase()}`;
    QRCode.toDataURL(memberCode, { width: 400, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [customer]);

  if (!customer) return null;

  const tier = getLoyaltyTier(customer.totalSpent, thresholds);
  const tierInfo = {
    ambassadeur: {
      gradient: "from-emerald-950 via-teal-900 to-slate-950",
      accent: "text-emerald-300",
      border: "border-emerald-500/40",
      glow: "shadow-emerald-900/30",
      label: "Membre Ambassadeur (VIP)",
    },
    privilegie: {
      gradient: "from-amber-950 via-amber-900 to-stone-950",
      accent: "text-amber-300",
      border: "border-amber-500/40",
      glow: "shadow-amber-900/30",
      label: t("preferredMember"),
    },
    habitue: {
      gradient: "from-stone-900 via-stone-950 to-black",
      accent: "text-mv-green-light",
      border: "border-stone-700/60",
      glow: "shadow-black/40",
      label: t("regularMember"),
    },
  }[tier];

  const dollarValuation = customer.loyaltyPoints / (rate > 0 ? rate : 1);
  const memberCode = `FLOW-${customer.id.slice(0, 8).toUpperCase()}`;

  function handleCopy() {
    navigator.clipboard.writeText(memberCode);
    setCopied(true);
    toast.success(t("memberCodeCopied"));
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `pass-fidelite-${customer?.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("digitalLoyaltyPass")}
      description={t("virtualCardWithA")}
    >
      <div className="space-y-4">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tierInfo.gradient} ${tierInfo.border} ${tierInfo.glow} p-5 text-white shadow-2xl border`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={tierInfo.accent} />
              <span className="font-display text-[15px] font-bold tracking-wide text-white">{restaurantName}</span>
            </div>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${tierInfo.accent}`}>
              {tierInfo.label}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[12px] uppercase font-semibold tracking-wider text-white/60">{t("holder")}</p>
              <p className="font-display text-[18px] font-bold text-white mt-0.5">{customer.name}</p>
              <p className="font-mono text-[12px] text-white/70 mt-0.5">{memberCode}</p>
            </div>

            {qrDataUrl && (
              <div className="rounded-xl bg-white p-1.5 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={t("memberCode")} className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <span className="text-[12px] uppercase font-medium text-white/60">{t("pointsBalance")}</span>
              <p className="font-display text-[20px] font-bold text-white leading-tight">
                {customer.loyaltyPoints} <span className="text-[13px] font-normal text-white/70">pts</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[12px] uppercase font-medium text-white/60">{t("rewardValue")}</span>
              <p className={`font-mono text-[15px] font-bold ${tierInfo.accent}`}>
                ~{formatCurrency(dollarValuation)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} className="text-[12px] gap-1.5">
            {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />} Copier code membre
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!qrDataUrl} className="text-[12px] gap-1.5">
            <Download size={14} /> {t("downloadQrPass")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BirthdayPerksCard({
  restaurantId,
  restaurantTimezone,
  customers,
  onGranted,
}: {
  restaurantId: string | null;
  restaurantTimezone: string;
  customers: Customer[];
  onGranted: (updated: Customer) => void;
}) {
  const t = useTranslations("fidelisationView");
  const [grantingId, setGrantingId] = useState<string | null>(null);

  const upcomingBirthdays = useMemo(() => {
    return customers
      .map((c) => ({
        customer: c,
        daysUntil: getDaysUntilBirthday(c.birthday, new Date(), restaurantTimezone),
      }))
      .filter((item): item is { customer: Customer; daysUntil: number } => item.daysUntil !== null && item.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [customers, restaurantTimezone]);

  async function handleGrantBonus(customer: Customer) {
    if (!restaurantId) return;
    setGrantingId(customer.id);
    try {
      const updated = await grantBirthdayBonusAction(restaurantId, customer.id);
      if (updated?.alreadyGranted) {
        toast.info(t("birthdayBonusAlready", { name: customer.name }));
      } else if (updated) {
        onGranted(updated.customer);
        toast.success(t("birthdayGiftAwarded", { name: customer.name }));
      } else {
        notifyError(t("couldNotAwardThe"));
      }
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <Card className="border-mv-amber/40 bg-gradient-to-br from-mv-amber-tint/30 to-mv-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-amber-tint text-mv-amber-dark border border-mv-amber/30">
            <Cake size={16} />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-bold text-mv-ink">{t("upcomingBirthdays")}</h3>
            <p className="text-[12px] text-mv-ink-soft">{t("awardingBonusesSurprisesTo")}</p>
          </div>
        </div>
        <Badge tone={upcomingBirthdays.length > 0 ? "amber" : "neutral"}>
          {t("toCelebrate", { count: upcomingBirthdays.length })}
        </Badge>
      </div>

      {upcomingBirthdays.length === 0 ? (
        <p className="text-[12px] text-mv-ink-faint py-4 text-center">
          {t("noBirthdays14")}
        </p>
      ) : (
        <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
          {upcomingBirthdays.map(({ customer, daysUntil }) => (
            <div
              key={customer.id}
              className="flex items-center justify-between rounded-xl border border-mv-amber/20 bg-mv-surface p-2.5 shadow-mv-xs"
            >
              <div>
                <p className="font-semibold text-[13px] text-mv-ink">{customer.name}</p>
                <p className="text-[12px] text-mv-ink-faint">
                  {daysUntil === 0 ? (
                    <span className="font-bold text-mv-amber-dark">{t("itSTheirBirthday")}</span>
                  ) : (
                    `Dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGrantBonus(customer)}
                disabled={grantingId === customer.id}
                className="text-[12px] h-7 px-2.5 bg-mv-amber-tint hover:bg-mv-amber hover:text-white text-mv-amber-dark border-mv-amber/30"
              >
                <Gift size={12} /> {grantingId === customer.id ? t("offered") : "Offrir +50 pts"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * "Annoncer" — a one-off broadcast to every consented customer (e.g.
 * "nouveaux pâtés du jour"). Reaches each via email -> push -> SMS,
 * whichever applies first — see broadcastAnnouncement.
 */
function AnnouncementModal({
  restaurantId,
  open,
  onClose,
}: {
  restaurantId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("fidelisationView");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  function handleClose() {
    if (sending) return;
    setTitle("");
    setBody("");
    onClose();
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!restaurantId || !title.trim() || !body.trim()) return;
    setSending(true);
    const result = await sendAnnouncementAction(restaurantId, title, body);
    setSending(false);
    if (result.ok) {
      toast.success(
        result.total === 0
          ? t("noCustomersHaveAgreed")
          : t("announcementSent", { count: result.sent, total: result.total })
      );
      setTitle("");
      setBody("");
      onClose();
    } else {
      notifyError(t("couldNotSendThe"));
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("announceSomethingToYour")}
      description={t("sentOnlyToCustomers")}
    >
      <form onSubmit={handleSend} className="space-y-3">
        <Field label={t("title")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("eGNewMeat")} required autoFocus />
        </Field>
        <Field label={t("message")}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder={t("eGComeAnd")}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={sending || !title.trim() || !body.trim()}>
          {sending ? t("sending") : "Envoyer l'annonce"}
        </Button>
      </form>
    </Modal>
  );
}

export function FidelisationView({
  restaurantId,
  restaurantName = "Restaurant",
  restaurantTimezone = "America/Toronto",
  initialCustomers,
  loyaltyPointsPerDollar,
  loyaltyTierThresholds,
}: {
  restaurantId: string | null;
  restaurantName?: string;
  restaurantTimezone?: string;
  initialCustomers: Customer[];
  loyaltyPointsPerDollar: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const t = useTranslations("fidelisationView");
  const { role } = useApp();
  const router = useRouter();

  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [passCustomer, setPassCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Reset to page 1 whenever the search term actually changes — adjusted
  // during render (React's documented pattern) rather than in a useEffect,
  // which would cause an extra cascading render.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <FidelisationSubNav />

      <PageHeader
        eyebrow={t("customers")}
        title={t("loyalty")}
        description={t("customerRecordsVisitsDigital")}
        action={
          canCreate && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAnnounceOpen(true)}>
                <Megaphone size={15} /> Annoncer
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouveau client
              </Button>
            </div>
          )
        }
      />

      <AnnouncementModal restaurantId={restaurantId} open={announceOpen} onClose={() => setAnnounceOpen(false)} />

      <div className="mb-3">
        <IdentificationAuComptoirCard
          restaurantId={restaurantId!}
          onVisitLogged={(updated) => setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RewardValidationCard restaurantId={restaurantId!} />
        <BirthdayPerksCard
          restaurantId={restaurantId}
          restaurantTimezone={restaurantTimezone}
          customers={customers}
          onGranted={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
        />
      </div>

      <div className="mb-5">
        <CustomerOriginCard
          cities={getCustomerOriginByCity(customers)}
          profileCount={customers.filter((customer) => customer.city?.trim()).length}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchACustomer")}
            className="pl-8"
          />
        </div>
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} client{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={t("noCustomers")}
          description={t("addYourFirstCustomer")}
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouveau client
              </Button>
            )
          }
        />
      ) : (
        <>
          <Table containerClassName="max-h-[355px] overflow-y-auto">
            <THead className="sticky top-0 z-10 shadow-mv-xs bg-mv-cream-soft">
              <Th>{t("customer")}</Th>
              <Th>{t("lastVisit")}</Th>
              <Th className="text-right">{t("visits")}</Th>
              <Th className="text-right">{t("totalSpent")}</Th>
              <Th className="text-right">{t("points")}</Th>
              <Th className="text-right">{t("cardPass")}</Th>
            </THead>
            <tbody>
              {visible.map((c) => {
                const daysUntilBday = getDaysUntilBirthday(c.birthday, new Date(), restaurantTimezone);
                return (
                  <Tr key={c.id} onClick={() => router.push(`/fidelisation/${c.id}`)}>
                    <Td className="font-semibold">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{c.name}</span>
                        <LoyaltyTierBadge totalSpent={c.totalSpent} thresholds={loyaltyTierThresholds} size="xs" />
                        {daysUntilBday !== null && daysUntilBday <= 14 && (
                          <Badge tone="amber" className="text-[12px] px-1.5 py-0">
                            🎂 {daysUntilBday === 0 ? t("birthdayToday") : t("birthdayInDays", { days: daysUntilBday })}
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="text-mv-ink-soft">{c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}</Td>
                    <Td className="text-right">{c.visitCount}</Td>
                    <Td className="text-right font-medium">{formatCurrency(c.totalSpent)}</Td>
                    <Td className="text-right">
                      <Badge tone="green">{c.loyaltyPoints} pts</Badge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPassCustomer(c);
                        }}
                        className="h-7 px-2 text-[12px] gap-1 border-mv-border text-mv-ink-soft hover:text-mv-ink"
                      >
                        <CreditCard size={12} /> {t("digitalPass")}
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <TablePagination page={safePage} pageCount={pageCount} onPageChange={setPage} className="mt-3" />
        </>
      )}

      {restaurantId && (
        <NewCustomerModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
            router.push(`/fidelisation/${c.id}`);
          }}
        />
      )}

      <DigitalLoyaltyPassModal
        customer={passCustomer}
        restaurantName={restaurantName}
        rate={loyaltyPointsPerDollar}
        thresholds={loyaltyTierThresholds}
        open={Boolean(passCustomer)}
        onClose={() => setPassCustomer(null)}
      />
    </div>
  );
}
