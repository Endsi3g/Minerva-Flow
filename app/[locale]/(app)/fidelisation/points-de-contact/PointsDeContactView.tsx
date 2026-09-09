"use client";

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

const TYPE_LABELS: Record<PhysicalTouchpointType, string> = {
  caisse: "Caisse",
  comptoir: "Comptoir",
  table: "Table",
  vitrine: "Vitrine",
  sortie: "Sortie",
  sac_recu: "Sac / Reçu",
  carte_client: "Carte client",
  autre: "Autre",
};

const DESTINATION_LABELS: Record<PhysicalTouchpointDestinationKind, string> = {
  loyalty_join: "Rejoindre la fidélité",
  menu: "Voir le menu",
  review: "Avis Google",
  custom_url: "Lien personnalisé",
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
      ? { label: "inscriptions", value: counts.loyalty_activated ?? 0 }
      : touchpoint.destinationKind === "review"
        ? { label: "avis démarrés", value: counts.review_flow_started ?? 0 }
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
            {touchpoint.label} <span className="text-mv-ink-faint font-normal">· {TYPE_LABELS[touchpoint.type]}</span>
          </p>
          <p className="truncate text-[11.5px] text-mv-ink-faint">
            /t/{touchpoint.code} · {DESTINATION_LABELS[touchpoint.destinationKind]} · {scans} scan{scans === 1 ? "" : "s"}
            {secondary ? ` · ${secondary.value} ${secondary.label}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={`/fidelisation/partage/studio-qr?url=${encodeURIComponent(url)}`}
          className="text-mv-ink-faint hover:text-mv-ink"
          aria-label="Ouvrir dans le Studio QR"
          title="Ouvrir dans le Studio QR"
        >
          <Wand2 size={14} />
        </a>
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="text-mv-ink-faint hover:text-mv-ink disabled:opacity-40"
          aria-label="Télécharger le code QR"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => window.open(url, "_blank")}
          className="text-mv-ink-faint hover:text-mv-ink"
          aria-label="Ouvrir le lien"
        >
          <ExternalLink size={14} />
        </button>
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label="Copier le lien">
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(touchpoint.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label="Supprimer le point de contact"
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
        notifyError("La création a échoué. Vérifiez le lien fourni.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau point de contact"
      description="Un support physique (autocollant NFC, chevalet, sous-verre…) qui redirige vers votre app, avec ses propres statistiques."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom du support" hint="Pour vous repérer dans la liste">
          <Input name="label" placeholder="Ex : Comptoir - Caisse" required autoFocus />
        </Field>
        <Field label="Emplacement">
          <Select name="type" defaultValue="comptoir">
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Destination" hint="Où le client atterrit après avoir tapé/scanné">
          <Select
            value={destinationKind}
            onChange={(e) => setDestinationKind(e.target.value as PhysicalTouchpointDestinationKind)}
          >
            {Object.entries(DESTINATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {needsUrl && (
          <Field label="Lien" hint={destinationKind === "review" ? "Votre lien d'avis Google" : "N'importe quelle URL"}>
            <Input name="destinationValue" type="url" placeholder="https://…" required />
          </Field>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const NFC_CARD_ORDER_STATUS_LABELS: Record<NfcCardOrder["status"], string> = {
  paid: "Payée",
  shipped: "Expédiée",
  fulfilled: "Livrée",
  cancelled: "Annulée",
};

function NfcCardOrderPanel({
  restaurantId,
  funnels,
}: {
  restaurantId: string;
  funnels: PhysicalTouchpointFunnel[];
}) {
  const [quantity, setQuantity] = useState(1);
  const [touchpointId, setTouchpointId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleOrder() {
    setIsSubmitting(true);
    try {
      const url = await createNfcCardOrderCheckoutAction(restaurantId, quantity, touchpointId || null);
      if (url) window.location.href = url;
      else notifyError("La commande a échoué. Réessayez dans un instant.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Matériel"
        title="Cartes NFC personnalisées"
        description="Une carte NFC brandée, prête à poser au comptoir ou à donner à un client VIP — 75 $ CAD/carte, livrée chez vous."
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <Field label="Quantité">
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
          <Field label="Lien à encoder sur la carte">
            <Select value={touchpointId} onChange={(e) => setTouchpointId(e.target.value)}>
              <option value="">Je m&apos;en occupe moi-même plus tard</option>
              {funnels.map((f) => (
                <option key={f.touchpoint.id} value={f.touchpoint.id}>
                  {f.touchpoint.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={handleOrder} disabled={isSubmitting}>
          <CreditCard size={14} /> {isSubmitting ? "Redirection…" : `Commander (${quantity * 75} $ CAD)`}
        </Button>
      </div>
      {funnels.length === 0 && (
        <p className="mt-2.5 text-[11.5px] text-mv-ink-faint">
          Vous n&apos;avez pas encore de point de contact — créez-en un ci-dessous si vous voulez que votre commande
          soit liée à un lien précis.
        </p>
      )}
    </Card>
  );
}

function NfcCardOrderHistory({ orders, funnels }: { orders: NfcCardOrder[]; funnels: PhysicalTouchpointFunnel[] }) {
  if (orders.length === 0) return null;
  const labelFor = (touchpointId: string | null) =>
    touchpointId ? funnels.find((f) => f.touchpoint.id === touchpointId)?.touchpoint.label : null;

  return (
    <Card>
      <CardHeader eyebrow="Matériel" title="Vos commandes de cartes NFC" />
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
                  <p className="text-[11.5px] text-mv-ink-faint">{new Date(order.createdAt).toLocaleDateString("fr-CA")}</p>
                </div>
              </div>
              <span className="text-[11.5px] font-medium text-mv-ink-faint">{NFC_CARD_ORDER_STATUS_LABELS[order.status]}</span>
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
  const [funnels, setFunnels] = useState(initialFunnels);
  const [createOpen, setCreateOpen] = useState(false);

  function handleDeleted(id: string) {
    if (!restaurantId) return;
    deleteTouchpointAction(restaurantId, id).then((ok) => {
      if (ok) setFunnels((prev) => prev.filter((f) => f.touchpoint.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        title="Points de contact"
        description="Chaque autocollant NFC, chevalet ou sous-verre pointe vers un lien unique — vous voyez exactement quel support amène des inscriptions."
      />
      {nfcCardPurchaseEnabled && restaurantId && (
        <div className="mb-6 space-y-4">
          <NfcCardOrderPanel restaurantId={restaurantId} funnels={funnels} />
          <NfcCardOrderHistory orders={nfcCardOrders} funnels={funnels} />
        </div>
      )}
      <Card>
        <CardHeader
          eyebrow="Supports physiques"
          title="Vos points de contact"
          description="Comptoir, table, vitrine, sortie… chacun avec son propre lien et ses propres statistiques."
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
            <MapPin size={14} /> Aucun point de contact créé pour l&apos;instant.
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
