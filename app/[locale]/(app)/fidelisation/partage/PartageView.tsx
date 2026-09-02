"use client";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import type { LoyaltyShare } from "@/lib/types";
import { Share2, QrCode, Download, ExternalLink, Copy, Check, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { createLoyaltyShareAction, deleteLoyaltyShareAction } from "../actions";
import { notifyError } from "@/lib/notify-error";

function LoyaltyShareRow({ share, onDeleted }: { share: LoyaltyShare; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app"}/f/${share.token}`;

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
    a.download = `qr-${share.title.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" className="h-9 w-9 shrink-0 rounded border border-mv-border-soft" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-mv-ink">{share.title}</p>
          <p className="truncate text-[11.5px] text-mv-ink-faint">/f/{share.token}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
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
          title="Ouvrir le lien"
        >
          <ExternalLink size={14} />
        </button>
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label="Copier le lien">
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(share.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label="Supprimer le lien"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ShareLoyaltyModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (share: LoyaltyShare) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const share = await createLoyaltyShareAction(restaurantId, String(form.get("title") ?? "") || "Fidélité");
      if (share) {
        onCreated(share);
        onClose();
      } else {
        notifyError("La création du lien a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Partager la fidélité"
      description="Génère un lien public — un nouveau client peut rejoindre le programme sans avoir de fiche existante."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Titre" hint="Affiché sur la page publique">
          <Input name="title" placeholder="Fidélité" defaultValue="Fidélité" required autoFocus />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Générer le lien"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function PartageView({
  restaurantId,
  initialLoyaltyShares,
}: {
  restaurantId: string | null;
  initialLoyaltyShares: LoyaltyShare[];
}) {
  const [shares, setShares] = useState(initialLoyaltyShares);
  const [shareOpen, setShareOpen] = useState(false);

  function handleDeleted(id: string) {
    if (!restaurantId) return;
    deleteLoyaltyShareAction(restaurantId, id).then((ok) => {
      if (ok) setShares((prev) => prev.filter((s) => s.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        eyebrow="Croissance"
        title="Partage"
        description="Liens et codes QR pour que de nouveaux clients rejoignent votre programme de fidélité eux-mêmes."
        action={
          <Button size="sm" variant="secondary" nativeButton={false} render={<Link href="/fidelisation/partage/studio-qr" />}>
            <QrCode size={14} /> Studio QR & Affiches
          </Button>
        }
      />
      <Card>
        <CardHeader
          eyebrow="Liens de partage"
          title="Partager la fidélité"
          description="Un lien ou un code QR pour qu'un nouveau client rejoigne le programme lui-même."
          action={
            restaurantId && (
              <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
                <Share2 size={14} /> Nouveau lien
              </Button>
            )
          }
        />
        {shares.length === 0 ? (
          <p className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
            <QrCode size={14} /> Aucun lien généré pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-2">
            {shares.map((s) => (
              <LoyaltyShareRow key={s.id} share={s} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
        {restaurantId && (
          <ShareLoyaltyModal
            restaurantId={restaurantId}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            onCreated={(s) => setShares((prev) => [s, ...prev])}
          />
        )}
      </Card>
    </div>
  );
}
