"use client";


import { intlLocale } from "@/lib/format-locale";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { createTouchpointAction, deleteTouchpointAction } from "../actions";
import { createNfcCardOrderCheckoutAction } from "./actions";
import { notifyError } from "@/lib/notify-error";
import type {
  NfcCardOrder,
  PhysicalTouchpointDestinationKind,
  PhysicalTouchpointFunnel,
  PhysicalTouchpointType,
} from "@/lib/types";
import { MapPin, Plus, Download, ExternalLink, Copy, Check, Trash2, Wand2, CreditCard, Truck } from "lucide-react";
import QRCode from "qrcode";

const TYPE_LABELS_KEYS: Record<PhysicalTouchpointType, string> = {
  caisse: "typelabelsCaisse",
  comptoir: "typelabelsComptoir",
  table: "typelabelsTable",
  vitrine: "typelabelsVitrine",
  sortie: "typelabelsSortie",
  sac_recu: "typelabelsSacRecu",
  carte_client: "typelabelsCarteClient",
  autre: "typelabelsAutre",
};

const DESTINATION_LABELS_KEYS: Record<PhysicalTouchpointDestinationKind, string> = {
  loyalty_join: "destinationlLoyaltyJoin",
  menu: "destinationlMenu",
  review: "destinationlReview",
  custom_url: "destinationlCustomUrl",
};

function touchpointUrl(code: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app"}/t/${code}`;
}

function TouchpointRow({
  funnel,
  onDeleted,
}: {
  funnel: PhysicalTouchpointFunnel;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("touchpoints");
  const { touchpoint, counts } = funnel;
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = touchpointUrl(touchpoint.code);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [url]);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${touchpoint.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  const scans = counts.touchpoint_opened ?? 0;
  const secondary =
    touchpoint.destinationKind === "loyalty_join"
      ? { label: t("signUpsLabel"), value: counts.loyalty_activated ?? 0 }
      : touchpoint.destinationKind === "review"
        ? { label: t("reviewsStarted"), value: counts.review_flow_started ?? 0 }
        : null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" className="h-9 w-9 shrink-0 rounded border border-mv-border-soft" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-mv-ink">
            {touchpoint.label} <span className="text-mv-ink-faint font-normal">· {t(TYPE_LABELS_KEYS[touchpoint.type])}</span>
          </p>
          <p className="truncate text-[12px] text-mv-ink-faint">
            /t/{touchpoint.code} · {t(DESTINATION_LABELS_KEYS[touchpoint.destinationKind])} · {t("scanCount", { count: scans })}
            {secondary ? ` · ${secondary.value} ${secondary.label}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={`/fidelisation/partage/studio-qr?url=${encodeURIComponent(url)}`}
          className="text-mv-ink-faint hover:text-mv-ink"
          aria-label={t("openInTheQr")}
          title={t("openInTheQr")}
        >
          <Wand2 size={14} />
        </a>
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="text-mv-ink-faint hover:text-mv-ink disabled:opacity-40"
          aria-label={t("downloadTheQrCode")}
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => window.open(url, "_blank")}
          className="text-mv-ink-faint hover:text-mv-ink"
          aria-label={t("openTheLink")}
        >
          <ExternalLink size={14} />
        </button>
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label={t("copyTheLink")}>
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(touchpoint.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label={t("deleteTheTouchpoint")}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function NewTouchpointModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (funnel: PhysicalTouchpointFunnel) => void;
}) {
  const t = useTranslations("touchpoints");
  const [destinationKind, setDestinationKind] = useState<PhysicalTouchpointDestinationKind>("loyalty_join");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const needsUrl = destinationKind === "review" || destinationKind === "custom_url";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const touchpoint = await createTouchpointAction(restaurantId, {
        type: String(form.get("type")) as PhysicalTouchpointType,
        label: String(form.get("label") ?? ""),
        destinationKind,
        destinationValue: needsUrl ? String(form.get("destinationValue") ?? "") : undefined,
      });
      if (touchpoint) {
        onCreated({ touchpoint, counts: {} });
        onClose();
      } else {
        notifyError(t("creationFailedCheckThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("newTouchpoint")}
      description={t("aPhysicalItemNfc")}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("itemName")} hint={t("toFindItIn")}>
          <Input name="label" placeholder={t("eGCounterRegister")} required autoFocus />
        </Field>
        <Field label={t("location")}>
          <Select name="type" defaultValue="comptoir">
            {Object.entries(TYPE_LABELS_KEYS).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("destination")} hint={t("whereTheCustomerLands")}>
          <Select
            value={destinationKind}
            onChange={(e) => setDestinationKind(e.target.value as PhysicalTouchpointDestinationKind)}
          >
            {Object.entries(DESTINATION_LABELS_KEYS).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
        </Field>
        {needsUrl && (
          <Field label={t("link")} hint={destinationKind === "review" ? t("yourGoogleReviewLink") : "N'importe quelle URL"}>
            <Input name="destinationValue" type="url" placeholder="https://…" required />
          </Field>
        )}
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

const NFC_CARD_ORDER_STATUS_LABELS_KEYS: Record<NfcCardOrder["status"], string> = {
  paid: "nfccardorderPaid",
  shipped: "nfccardorderShipped",
  fulfilled: "nfccardorderFulfilled",
  cancelled: "nfccardorderCancelled",
};

function NfcCardOrderPanel({
  restaurantId,
  funnels,
}: {
  restaurantId: string;
  funnels: PhysicalTouchpointFunnel[];
}) {
  const t = useTranslations("touchpoints");
  const [quantity, setQuantity] = useState(1);
  const [touchpointId, setTouchpointId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleOrder() {
    setIsSubmitting(true);
    try {
      const url = await createNfcCardOrderCheckoutAction(restaurantId, quantity, touchpointId || null);
      if (url) window.location.href = url;
      else notifyError(t("theOrderFailedTry"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("hardware")}
        title={t("customNfcCards")}
        description={t("aBrandedNfcCard")}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <Field label={t("quantity")}>
            <Input
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            />
          </Field>
        </div>
        <div className="w-64">
          <Field label={t("linkToEncodeOn")}>
            <Select value={touchpointId} onChange={(e) => setTouchpointId(e.target.value)}>
              <option value="">{t("iLlTakeCare")}</option>
              {funnels.map((f) => (
                <option key={f.touchpoint.id} value={f.touchpoint.id}>
                  {f.touchpoint.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={handleOrder} disabled={isSubmitting}>
          <CreditCard size={14} /> {isSubmitting ? t("redirecting") : t("orderWithPrice", { price: quantity * 75 })}
        </Button>
      </div>
      {funnels.length === 0 && (
        <p className="mt-2.5 text-[12px] text-mv-ink-faint">
          {t("youDoNotHave")}
        </p>
      )}
    </Card>
  );
}

function NfcCardOrderHistory({ orders, funnels }: { orders: NfcCardOrder[]; funnels: PhysicalTouchpointFunnel[] }) {
  const t = useTranslations("touchpoints");
  const locale = useLocale();
  if (orders.length === 0) return null;
  const labelFor = (touchpointId: string | null) =>
    touchpointId ? funnels.find((f) => f.touchpoint.id === touchpointId)?.touchpoint.label : null;

  return (
    <Card>
      <CardHeader eyebrow={t("hardware")} title={t("yourNfcCardOrders")} />
      <div className="space-y-2">
        {orders.map((order) => {
          const linkedLabel = labelFor(order.touchpointId);
          return (
            <div key={order.id} className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
              <div className="flex items-center gap-2.5">
                <Truck size={14} className="text-mv-ink-faint" />
                <div>
                  <p className="text-[12.5px] font-medium text-mv-ink">
                    {order.quantity} carte{order.quantity > 1 ? "s" : ""} · {order.totalAmountCad} $ CAD
                    {linkedLabel && <span className="text-mv-ink-faint"> · {linkedLabel}</span>}
                  </p>
                  <p className="text-[12px] text-mv-ink-faint">{new Date(order.createdAt).toLocaleDateString(intlLocale(locale))}</p>
                </div>
              </div>
              <span className="text-[12px] font-medium text-mv-ink-faint">{t(NFC_CARD_ORDER_STATUS_LABELS_KEYS[order.status])}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PointsDeContactView({
  restaurantId,
  initialFunnels,
  nfcCardOrders,
  nfcCardPurchaseEnabled,
}: {
  restaurantId: string | null;
  initialFunnels: PhysicalTouchpointFunnel[];
  nfcCardOrders: NfcCardOrder[];
  nfcCardPurchaseEnabled: boolean;
}) {
  const t = useTranslations("touchpoints");
  const [funnels, setFunnels] = useState(initialFunnels);
  const [createOpen, setCreateOpen] = useState(false);

  function handleDeleted(id: string) {
    if (!restaurantId) return;
    deleteTouchpointAction(restaurantId, id).then((ok) => {
      if (ok) setFunnels((prev) => prev.filter((f) => f.touchpoint.id !== id));
      else notifyError(t("deletionFailed"));
    });
  }

  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        title={t("touchpoints")}
        description={t("everyNfcStickerTable")}
      />
      {nfcCardPurchaseEnabled && restaurantId && (
        <div className="mb-6 space-y-4">
          <NfcCardOrderPanel restaurantId={restaurantId} funnels={funnels} />
          <NfcCardOrderHistory orders={nfcCardOrders} funnels={funnels} />
        </div>
      )}
      <Card>
        <CardHeader
          eyebrow={t("physicalItems")}
          title={t("yourTouchpoints")}
          description={t("counterTableWindowExit")}
          action={
            restaurantId && (
              <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> Nouveau point de contact
              </Button>
            )
          }
        />
        {funnels.length === 0 ? (
          <p className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
            <MapPin size={14} /> {t("noTouchpointYet")}
          </p>
        ) : (
          <div className="space-y-2">
            {funnels.map((f) => (
              <TouchpointRow key={f.touchpoint.id} funnel={f} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
        {restaurantId && (
          <NewTouchpointModal
            restaurantId={restaurantId}
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={(f) => setFunnels((prev) => [f, ...prev])}
          />
        )}
      </Card>
    </div>
  );
}
