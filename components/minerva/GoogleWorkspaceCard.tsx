"use client";

import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { GOOGLE_FEATURE_LABELS, GOOGLE_SCOPES, type GoogleFeature } from "@/lib/google/config";
import { GoogleConnectModal } from "@/components/minerva/GoogleConnectModal";
import {
  getGoogleWorkspaceStatusAction,
  saveGa4PropertyIdAction,
} from "@/app/[locale]/(app)/settings/google-workspace-actions";
import type { GoogleConnection } from "@/lib/data/google-connections";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Google,
  GoogleMonochrome,
  GoogleWorkspace,
  Gmail,
  GoogleSheets,
  GoogleDrive,
  GoogleCalendar,
  GoogleAnalytics,
  GoogleAds,
} from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const FEATURES: GoogleFeature[] = ["gmail", "sheets", "drive", "calendar", "analytics"];

const ALL_GOOGLE_SERVICES: {
  id: GoogleFeature | "ads";
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; width?: number; height?: number; className?: string }>;
}[] = [
  { id: "gmail", label: "Gmail", description: "Rapports d'activité & alertes", Icon: Gmail },
  { id: "calendar", label: "Calendar", description: "Synchronisation des plannings & réservations", Icon: GoogleCalendar },
  { id: "sheets", label: "Sheets", description: "Exports comptables et analyses de vente", Icon: GoogleSheets },
  { id: "drive", label: "Drive", description: "Sauvegardes et pièces justificatives", Icon: GoogleDrive },
  { id: "analytics", label: "Analytics GA4", description: "Trafic web & comportement clients", Icon: GoogleAnalytics },
  { id: "ads", label: "Google Ads", description: "Campagnes sponsorisées & conversion", Icon: GoogleAds },
];

export function GoogleWorkspaceCard() {
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ configured: boolean; connection: GoogleConnection | null } | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [ga4Input, setGa4Input] = useState("");

  async function refresh() {
    if (!restaurantId) return;
    const data = await getGoogleWorkspaceStatusAction(restaurantId);
    setStatus(data);
    setGa4Input(data.connection?.ga4PropertyId ?? "");
  }

  useEffect(() => {
    refresh();
  }, [restaurantId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected")) {
      toast.success("Google connecté avec succès.");
      refresh();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google_error")) {
      toast.error("La connexion Google a échoué — réessayez.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveGa4() {
    if (!restaurantId || !ga4Input.trim()) return;
    await saveGa4PropertyIdAction(restaurantId, ga4Input);
    toast.success("ID de propriété GA4 enregistré.");
    refresh();
  }

  if (!status) return null;

  const connection = status.connection;
  const isConnected = Boolean(connection && connection.status === "connecte");
  const grantedFeatures = FEATURES.filter((f) => connection?.grantedScopes.includes(GOOGLE_SCOPES[f]));

  return (
    <Card className="flex flex-col justify-between">
      <div>
        {/* Header with black Google SVG icon */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mv-border-soft bg-mv-surface shadow-mv-sm">
              <GoogleMonochrome size={22} className="text-mv-ink" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Google Workspace
              </span>
              <h3 className="font-display text-[18px] font-medium text-mv-ink">Google</h3>
            </div>
          </div>

          {isConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-mv-green-tint px-2.5 py-1 text-[11px] font-bold text-mv-green-dark">
              <Check size={13} /> Connecté
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-mv-border-soft bg-mv-cream-soft px-2.5 py-1 text-[11px] font-medium text-mv-ink-faint">
              Non connecté
            </span>
          )}
        </div>

        <p className="text-[12.5px] leading-relaxed text-mv-ink-soft mb-3.5">
          Gmail, Sheets, Drive, Calendar, Analytics et Ads — une seule connexion pour automatiser vos réservations, rapports et campagnes.
        </p>

        {/* Feature Rows structured like AdPlatformsCard */}
        <div className="mb-4 space-y-2">
          {ALL_GOOGLE_SERVICES.map((s) => {
            const Icon = s.Icon;
            const isGranted = isConnected && s.id !== "ads" && grantedFeatures.includes(s.id as GoogleFeature);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-mv-border-soft bg-mv-surface px-3 py-2 transition-colors hover:border-mv-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mv-border-soft bg-mv-cream-soft">
                    <Icon width={17} height={17} className="shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-mv-ink truncate">{s.label}</p>
                    <p className="text-[11.5px] text-mv-ink-faint truncate leading-tight">{s.description}</p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {isGranted ? (
                    <Badge tone="green" dot size="xs">
                      Connecté
                    </Badge>
                  ) : isConnected ? (
                    <span className="text-[11px] font-medium text-mv-ink-faint">Non accordé</span>
                  ) : (
                    <span className="text-[11px] font-medium text-mv-ink-faint">Prêt</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isConnected && connection?.connectedEmail && (
          <div className="mb-4 rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 px-3 py-2 text-[12px] text-mv-ink-soft flex items-center justify-between">
            <span className="font-medium truncate">{connection.connectedEmail}</span>
            <span className="text-[11px] text-mv-ink-faint">Compte actif</span>
          </div>
        )}
      </div>

      <div>
        {!status.configured ? (
          <p className="text-[13px] text-mv-ink-faint">Clés API non configurées.</p>
        ) : !isConnected ? (
          <Button size="sm" onClick={() => setModalOpen(true)} className="w-full flex items-center justify-center gap-2">
            <GoogleMonochrome size={16} className="text-white fill-current shrink-0" /> Connecter Google
          </Button>
        ) : (
          <div className="space-y-3">
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)} className="w-full">
              Gérer les accès Google
            </Button>

            {grantedFeatures.includes("analytics") && (
              <Field>
                <FieldLabel htmlFor="ga4-property-id">ID de propriété GA4</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="ga4-property-id"
                    value={ga4Input}
                    onChange={(e) => setGa4Input(e.target.value)}
                    placeholder="Ex : 123456789"
                    className="flex-1 text-[12.5px]"
                  />
                  <Button size="sm" variant="secondary" onClick={handleSaveGa4}>
                    Enregistrer
                  </Button>
                </div>
              </Field>
            )}
          </div>
        )}
      </div>

      <GoogleConnectModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refresh();
        }}
      />
    </Card>
  );
}
