"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/lib/app-context";
import {
  getReservationDeliveryConnectionsAction,
  saveReservationDeliveryCredentialsAction,
  removeReservationDeliveryConnectionAction,
} from "@/app/[locale]/(app)/settings/reservation-delivery-actions";
import type {
  ReservationDeliveryConnection,
  ReservationDeliveryProvider,
  ReservationDeliveryCategory,
} from "@/lib/data/reservation-delivery-connections";
import { formatDate } from "@/lib/utils";
import { CalendarCheck2, Bike, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

const PROVIDER_LABEL: Record<ReservationDeliveryProvider, string> = {
  opentable: "OpenTable",
  resy: "Resy",
  uber_direct: "Uber Direct / Uber Eats",
};

const PROVIDER_CATEGORY: Record<ReservationDeliveryProvider, ReservationDeliveryCategory> = {
  opentable: "reservation",
  resy: "reservation",
  uber_direct: "livraison",
};

// Aucun des trois n'a d'inscription libre-service — l'accès API passe par
// une candidature de partenariat approuvée par le fournisseur. Le lien
// pointe vers la page officielle où faire cette demande.
const PROVIDER_PARTNER_URL: Record<ReservationDeliveryProvider, string> = {
  opentable: "https://www.opentable.com/restaurant-solutions",
  resy: "https://resy.com/for-restaurants",
  uber_direct: "https://business.uber.com/en-US/direct/",
};

function ProviderIcon({ category }: { category: ReservationDeliveryCategory }) {
  return category === "reservation" ? (
    <CalendarCheck2 size={20} className="shrink-0 text-mv-ink-faint" />
  ) : (
    <Bike size={20} className="shrink-0 text-mv-ink-faint" />
  );
}

function CredentialsModal({
  provider,
  open,
  onClose,
  onSaved,
}: {
  provider: ReservationDeliveryProvider;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [externalAccountId, setExternalAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const ok = await saveReservationDeliveryCredentialsAction(
        provider,
        PROVIDER_CATEGORY[provider],
        { externalAccountId, apiKey }
      );
      if (ok) {
        toast.success(`${PROVIDER_LABEL[provider]} connecté.`);
        setExternalAccountId("");
        setApiKey("");
        onSaved();
        onClose();
      } else {
        toast.error("La connexion a échoué — vérifiez les identifiants.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Connecter ${PROVIDER_LABEL[provider]}`}>
      <div className="space-y-4">
        <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
          Ces champs correspondent aux identifiants fournis par {PROVIDER_LABEL[provider]} une
          fois votre demande de partenariat approuvée —{" "}
          <a
            href={PROVIDER_PARTNER_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="text-mv-green underline"
          >
            faire la demande
          </a>
          .
        </p>
        <Field label="Identifiant de compte / restaurant">
          <Input
            value={externalAccountId}
            onChange={(e) => setExternalAccountId(e.target.value)}
            placeholder="Ex : Restaurant ID"
          />
        </Field>
        <Field label="Clé API">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Fournie par le partenaire"
          />
        </Field>
        <Button
          className="w-full"
          disabled={!externalAccountId.trim() || !apiKey.trim() || isPending}
          onClick={handleSave}
        >
          {isPending ? "Connexion…" : "Connecter"}
        </Button>
      </div>
    </Modal>
  );
}

function ConnectRow({
  provider,
  connection,
  onChanged,
}: {
  provider: ReservationDeliveryProvider;
  connection?: ReservationDeliveryConnection;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function statusLine() {
    if (!connection) return "Nécessite un partenariat approuvé par le fournisseur";
    if (connection.lastSyncedAt) return `Dernière synchronisation — ${formatDate(connection.lastSyncedAt)}`;
    return "Identifiants enregistrés";
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
        <div className="flex items-center gap-3">
          <ProviderIcon category={PROVIDER_CATEGORY[provider]} />
          <div>
            <p className="text-[13.5px] font-semibold text-mv-ink">{PROVIDER_LABEL[provider]}</p>
            <p className="text-[12px] text-mv-ink-faint">{statusLine()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connection ? (
            <>
              <Badge tone="green" dot>
                Connecté
              </Badge>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await removeReservationDeliveryConnectionAction(provider);
                    onChanged();
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
              >
                <Trash2 size={12} /> Retirer
              </button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
              Connecter
            </Button>
          )}
        </div>
      </div>
      <CredentialsModal
        provider={provider}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onChanged}
      />
    </>
  );
}

export function ReservationDeliveryConnectionsCard() {
  const { restaurantId } = useApp();
  const [connections, setConnections] = useState<ReservationDeliveryConnection[] | null>(null);

  function refresh() {
    if (!restaurantId) return;
    getReservationDeliveryConnectionsAction(restaurantId).then(setConnections);
  }

  useEffect(refresh, [restaurantId]);

  if (!connections) return null;

  const byProvider = (provider: ReservationDeliveryProvider) =>
    connections.find((c) => c.provider === provider);

  return (
    <Card>
      <CardHeader
        eyebrow="Réservations & livraison tierces"
        title="OpenTable, Resy, Uber Direct"
        description="Ces plateformes exigent un partenariat d'affaires approuvé avant de fournir un accès API — connectez-les ici une fois vos identifiants reçus."
      />
      <div className="space-y-2">
        <ConnectRow provider="opentable" connection={byProvider("opentable")} onChanged={refresh} />
        <ConnectRow provider="resy" connection={byProvider("resy")} onChanged={refresh} />
        <ConnectRow provider="uber_direct" connection={byProvider("uber_direct")} onChanged={refresh} />
      </div>
    </Card>
  );
}
